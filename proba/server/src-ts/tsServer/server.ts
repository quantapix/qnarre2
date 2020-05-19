import * as fs from 'fs';
import * as stream from 'stream';
import * as vscode from 'vscode';
import type * as proto from '../protocol';
import { ServerResponse, TypeScriptRequests } from '../typescriptService';
import { Disposable, Reader, Tracer } from '../utils/extras';
import { TelemetryReporter } from '../utils/telemetry';
import { TypeScriptVersion } from '../utils/versionProvider';
import { RequestItem, RequestQueue, RequestQueueingType } from './requestQueue';
import { TypeScriptServerError } from './serverError';

interface Callback<R> {
  readonly onSuccess: (_: R) => void;
  readonly onError: (_: Error) => void;
  readonly startTime: number;
  readonly isAsync: boolean;
}

type SR<R extends proto.Response> = ServerResponse.Response<R>;

class CallbackMap<R extends proto.Response> {
  private readonly cbs = new Map<number, Callback<SR<R> | undefined>>();
  private readonly asyncCbs = new Map<number, Callback<SR<R> | undefined>>();

  destroy(cause: string) {
    const cancel = new ServerResponse.Cancelled(cause);
    for (const cb of this.cbs.values()) {
      cb.onSuccess(cancel);
    }
    this.cbs.clear();
    for (const cb of this.asyncCbs.values()) {
      cb.onSuccess(cancel);
    }
    this.asyncCbs.clear();
  }

  add(seq: number, cb: Callback<SR<R> | undefined>, isAsync: boolean) {
    if (isAsync) this.asyncCbs.set(seq, cb);
    else this.cbs.set(seq, cb);
  }

  fetch(seq: number): Callback<SR<R> | undefined> | undefined {
    const cb = this.cbs.get(seq) || this.asyncCbs.get(seq);
    this.delete(seq);
    return cb;
  }

  private delete(seq: number) {
    if (!this.cbs.delete(seq)) this.asyncCbs.delete(seq);
  }
}

interface OngoingCanceller {
  tryCancelOngoing(seq: number): boolean;
}

export class PipeCanceller implements OngoingCanceller {
  constructor(
    private readonly id: string,
    private readonly pipe: string | undefined,
    private readonly tracer: Tracer
  ) {}

  tryCancelOngoing(seq: number) {
    if (!this.pipe) return false;
    this.tracer.logTrace(this.id, `Server: trying to cancel with seq ${seq}`);
    try {
      fs.writeFileSync(this.pipe + seq, '');
    } catch {}
    return true;
  }
}

export interface IServer {
  readonly onExit: vscode.Event<any>;
  readonly onError: vscode.Event<any>;
  readonly onEvent: vscode.Event<proto.Event>;
  readonly onReaderError: vscode.Event<Error>;

  readonly tsServerLogFile: string | undefined;

  executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: false;
      lowPriority?: boolean;
    }
  ): undefined;
  executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: boolean;
      lowPriority?: boolean;
    }
  ): Promise<ServerResponse.Response<proto.Response>>;
  executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: boolean;
      lowPriority?: boolean;
    }
  ): Promise<ServerResponse.Response<proto.Response>> | undefined;

  dispose(): void;
  kill(): void;
}

export interface ServerDelegate {
  onFatalError(cmd: string, _: Error): void;
}

export interface ServerProcess {
  readonly stdout: stream.Readable;
  write(_: proto.Request): void;
  on(name: 'exit', handler: (_: number | null) => void): void;
  on(name: 'error', handler: (_: Error) => void): void;
  kill(): void;
}

export class ProcessBased extends Disposable implements IServer {
  private readonly reader: Reader<proto.Response>;
  private readonly queue = new RequestQueue();
  private readonly cbs = new CallbackMap<proto.Response>();
  private readonly pendings = new Set<number>();

  constructor(
    private readonly sid: string,
    private readonly proc: ServerProcess,
    private readonly logFile: string | undefined,
    private readonly canceller: OngoingCanceller,
    private readonly _version: TypeScriptVersion,
    private readonly telemetry: TelemetryReporter,
    private readonly tracer: Tracer
  ) {
    super();
    this.reader = this.register(new Reader<proto.Response>(this.proc.stdout));
    this.reader.onData((m) => this.dispatchMessage(m));
    this.proc.on('exit', (c) => {
      this._onExit.fire(c);
      this.cbs.destroy('server exited');
    });
    this.proc.on('error', (e) => {
      this._onError.fire(e);
      this.cbs.destroy('server error');
    });
  }

  private readonly _onEvent = this.register(new vscode.EventEmitter<proto.Event>());
  public readonly onEvent = this._onEvent.event;

  private readonly _onExit = this.register(new vscode.EventEmitter<any>());
  public readonly onExit = this._onExit.event;

  private readonly _onError = this.register(new vscode.EventEmitter<any>());
  public readonly onError = this._onError.event;

  public get onReaderError() {
    return this.reader.onError;
  }

  public get tsServerLogFile() {
    return this.logFile;
  }

  private write(r: proto.Request) {
    this.proc.write(r);
  }

  public dispose() {
    super.dispose();
    this.cbs.destroy('server disposed');
    this.pendings.clear();
  }

  public kill() {
    this.proc.kill();
  }

  private dispatchMessage(m: proto.Message) {
    try {
      switch (m.type) {
        case 'response':
          this.dispatchResponse(m as proto.Response);
          break;
        case 'event':
          const event = m as proto.Event;
          if (event.event === 'requestCompleted') {
            const seq = (event as proto.RequestCompletedEvent).body.request_seq;
            const cb = this.cbs.fetch(seq);
            if (cb) {
              this.tracer.traceRequestCompleted(this.sid, 'requestCompleted', seq, cb);
              cb.onSuccess(undefined);
            }
          } else {
            this.tracer.traceEvent(this.sid, event);
            this._onEvent.fire(event);
          }
          break;
        default:
          throw new Error(`Unknown message type ${m.type} received`);
      }
    } finally {
      this.sendNexts();
    }
  }

  private tryCancelRequest(seq: number, cmd: string) {
    try {
      if (this.queue.tryDeletePendingRequest(seq)) {
        this.logTrace(`Canceled with ${seq}`);
        return true;
      }
      if (this.canceller.tryCancelOngoing(seq)) return true;
      this.logTrace(`Missed cancel with ${seq}.`);
      return false;
    } finally {
      const cb = this.fetchCallback(seq);
      if (cb) cb.onSuccess(new ServerResponse.Cancelled(`Cancelled ${seq} - ${cmd}`));
    }
  }

  private dispatchResponse(r: proto.Response) {
    const cb = this.fetchCallback(r.request_seq);
    if (cb) {
      this.tracer.traceResponse(this.sid, r, cb);
      if (r.success) cb.onSuccess(r);
      else if (r.message === 'No content available.') {
        cb.onSuccess(ServerResponse.NoContent);
      } else cb.onError(TypeScriptServerError.create(this.sid, this._version, r));
    }
  }

  public executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: false;
      lowPriority?: boolean;
    }
  ): undefined;
  public executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: boolean;
      lowPriority?: boolean;
    }
  ): Promise<ServerResponse.Response<proto.Response>>;
  public executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: boolean;
      lowPriority?: boolean;
    }
  ): Promise<ServerResponse.Response<proto.Response>> | undefined {
    const request = this.queue.createRequest(cmd, args);
    const item: RequestItem = {
      request,
      expectsResponse: info.expectsResult,
      isAsync: info.isAsync,
      queueingType: ProcessBased.getQueueingType(cmd, info.lowPriority),
    };
    let r: Promise<ServerResponse.Response<proto.Response>> | undefined;
    if (info.expectsResult) {
      r = new Promise<ServerResponse.Response<proto.Response>>((res, rej) => {
        this.cbs.add(
          request.seq,
          {
            onSuccess: res,
            onError: rej,
            startTime: Date.now(),
            isAsync: info.isAsync,
          },
          info.isAsync
        );
        if (info.token) {
          info.token.onCancellationRequested(() => {
            this.tryCancelRequest(request.seq, cmd);
          });
        }
      }).catch((e: Error) => {
        if (e instanceof TypeScriptServerError) {
          if (!info.token || !info.token.isCancellationRequested) {
            /* __GDPR__
							"languageServiceErrorResponse" : {
								"${include}": [
									"${TypeScriptCommonProperties}",
									"${TypeScriptRequestErrorProperties}"
								]
							}
						*/
            this.telemetry.logTelemetry('languageServiceErrorResponse', e.telemetry);
          }
        }
        throw e;
      });
    }
    this.queue.enqueue(item);
    this.sendNexts();
    return r;
  }

  private sendNexts() {
    while (this.pendings.size === 0 && this.queue.length > 0) {
      const i = this.queue.dequeue();
      if (i) this.sendRequest(i);
    }
  }

  private sendRequest(i: RequestItem) {
    const r = i.request;
    this.tracer.traceRequest(this.sid, r, i.expectsResponse, this.queue.length);
    if (i.expectsResponse && !i.isAsync) this.pendings.add(i.request.seq);
    try {
      this.write(r);
    } catch (e) {
      const cb = this.fetchCallback(r.seq);
      if (cb) cb.onError(e);
    }
  }

  private fetchCallback(seq: number) {
    const cb = this.cbs.fetch(seq);
    if (cb) {
      this.pendings.delete(seq);
      return cb;
    }
    return;
  }

  private logTrace(m: string) {
    this.tracer.logTrace(this.sid, m);
  }

  private static readonly fenceCommands = new Set([
    'change',
    'close',
    'open',
    'updateOpen',
  ]);

  private static getQueueingType(cmd: string, low?: boolean) {
    if (ProcessBased.fenceCommands.has(cmd)) return RequestQueueingType.Fence;
    return low ? RequestQueueingType.LowPriority : RequestQueueingType.Normal;
  }
}

class RequestRouter {
  private static readonly sharedCommands = new Set<keyof TypeScriptRequests>([
    'change',
    'close',
    'open',
    'updateOpen',
    'configure',
    'configurePlugin',
  ]);

  constructor(
    private readonly servers: ReadonlyArray<{
      readonly server: IServer;
      readonly preferredCommands?: ReadonlySet<keyof TypeScriptRequests>;
    }>,
    private readonly delegate: ServerDelegate
  ) {}

  public execute(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: boolean;
      lowPriority?: boolean;
    }
  ): Promise<ServerResponse.Response<proto.Response>> | undefined {
    if (RequestRouter.sharedCommands.has(cmd)) {
      const states: RequestState.State[] = this.servers.map(
        () => RequestState.Unresolved
      );
      let token: vscode.CancellationToken | undefined;
      if (info.token) {
        const s = new vscode.CancellationTokenSource();
        info.token.onCancellationRequested(() => {
          if (states.some((state) => state === RequestState.Resolved)) return;
          s.cancel();
        });
        token = s.token;
      }
      let first: Promise<ServerResponse.Response<proto.Response>> | undefined;
      for (let i = 0; i < this.servers.length; ++i) {
        const req = this.servers[i].server.executeImpl(cmd, args, { ...info, token });
        if (i === 0) first = req;
        req?.then(
          (r) => {
            states[i] = RequestState.Resolved;
            const e = states.find((s) => s.type === RequestState.Type.Errored) as
              | RequestState.Errored
              | undefined;
            if (e) this.delegate.onFatalError(cmd, e.err);
            return r;
          },
          (e) => {
            states[i] = new RequestState.Errored(e);
            if (states.some((s) => s === RequestState.Resolved)) {
              this.delegate.onFatalError(cmd, e);
            }
            throw e;
          }
        );
      }
      return first;
    }
    for (const { preferredCommands, server } of this.servers) {
      if (!preferredCommands || preferredCommands.has(cmd)) {
        return server.executeImpl(cmd, args, info);
      }
    }
    throw new Error(`Could not find server for '${cmd}'`);
  }
}

export class SyntaxRouting extends Disposable implements IServer {
  private static readonly syntaxCommands = new Set<keyof TypeScriptRequests>([
    'navtree',
    'getOutliningSpans',
    'jsxClosingTag',
    'selectionRange',
    'format',
    'formatonkey',
    'docCommentTemplate',
  ]);

  private readonly syntaxServer: IServer;
  private readonly semanticServer: IServer;
  private readonly router: RequestRouter;

  public constructor(
    servers: { syntax: IServer; semantic: IServer },
    delegate: ServerDelegate
  ) {
    super();
    this.syntaxServer = servers.syntax;
    this.semanticServer = servers.semantic;
    this.router = new RequestRouter(
      [
        {
          server: this.syntaxServer,
          preferredCommands: SyntaxRouting.syntaxCommands,
        },
        {
          server: this.semanticServer,
          preferredCommands: undefined,
        },
      ],
      delegate
    );
    this.register(this.syntaxServer.onEvent((e) => this._onEvent.fire(e)));
    this.register(this.semanticServer.onEvent((e) => this._onEvent.fire(e)));
    this.register(
      this.semanticServer.onExit((e) => {
        this._onExit.fire(e);
        this.syntaxServer.kill();
      })
    );
    this.register(this.semanticServer.onError((e) => this._onError.fire(e)));
  }

  private readonly _onEvent = this.register(new vscode.EventEmitter<proto.Event>());
  public readonly onEvent = this._onEvent.event;

  private readonly _onExit = this.register(new vscode.EventEmitter<any>());
  public readonly onExit = this._onExit.event;

  private readonly _onError = this.register(new vscode.EventEmitter<any>());
  public readonly onError = this._onError.event;

  public get onReaderError() {
    return this.semanticServer.onReaderError;
  }

  public get tsServerLogFile() {
    return this.semanticServer.tsServerLogFile;
  }

  public kill(): void {
    this.syntaxServer.kill();
    this.semanticServer.kill();
  }

  public executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: false;
      lowPriority?: boolean;
    }
  ): undefined;
  public executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: boolean;
      lowPriority?: boolean;
    }
  ): Promise<ServerResponse.Response<proto.Response>>;
  public executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: boolean;
      lowPriority?: boolean;
    }
  ): Promise<ServerResponse.Response<proto.Response>> | undefined {
    return this.router.execute(cmd, args, info);
  }
}

export class GetErrRouting extends Disposable implements IServer {
  private static readonly diagnosticEvents = new Set([
    'configFileDiag',
    'syntaxDiag',
    'semanticDiag',
    'suggestionDiag',
  ]);

  private readonly getErrServer: IServer;
  private readonly mainServer: IServer;
  private readonly router: RequestRouter;

  public constructor(
    servers: { getErr: IServer; primary: IServer },
    delegate: ServerDelegate
  ) {
    super();
    this.getErrServer = servers.getErr;
    this.mainServer = servers.primary;
    this.router = new RequestRouter(
      [
        {
          server: this.getErrServer,
          preferredCommands: new Set<keyof TypeScriptRequests>([
            'geterr',
            'geterrForProject',
          ]),
        },
        {
          server: this.mainServer,
          preferredCommands: undefined,
        },
      ],
      delegate
    );
    this.register(
      this.getErrServer.onEvent((e) => {
        if (GetErrRouting.diagnosticEvents.has(e.event)) this._onEvent.fire(e);
      })
    );
    this.register(
      this.mainServer.onEvent((e) => {
        if (!GetErrRouting.diagnosticEvents.has(e.event)) this._onEvent.fire(e);
      })
    );
    this.register(this.getErrServer.onError((e) => this._onError.fire(e)));
    this.register(this.mainServer.onError((e) => this._onError.fire(e)));
    this.register(
      this.mainServer.onExit((e) => {
        this._onExit.fire(e);
        this.getErrServer.kill();
      })
    );
  }

  private readonly _onEvent = this.register(new vscode.EventEmitter<proto.Event>());
  public readonly onEvent = this._onEvent.event;

  private readonly _onExit = this.register(new vscode.EventEmitter<any>());
  public readonly onExit = this._onExit.event;

  private readonly _onError = this.register(new vscode.EventEmitter<any>());
  public readonly onError = this._onError.event;

  public get onReaderError() {
    return this.mainServer.onReaderError;
  }

  public get tsServerLogFile() {
    return this.mainServer.tsServerLogFile;
  }

  public kill(): void {
    this.getErrServer.kill();
    this.mainServer.kill();
  }

  public executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: false;
      lowPriority?: boolean;
    }
  ): undefined;
  public executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: boolean;
      lowPriority?: boolean;
    }
  ): Promise<ServerResponse.Response<proto.Response>>;
  public executeImpl(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: boolean;
      lowPriority?: boolean;
    }
  ): Promise<ServerResponse.Response<proto.Response>> | undefined {
    return this.router.execute(cmd, args, info);
  }
}

namespace RequestState {
  export const enum Type {
    Unresolved,
    Resolved,
    Errored,
  }

  export const Unresolved = { type: Type.Unresolved } as const;

  export const Resolved = { type: Type.Resolved } as const;

  export class Errored {
    readonly type = Type.Errored;
    constructor(public readonly err: Error) {}
  }

  export type State = typeof Unresolved | typeof Resolved | Errored;
}
