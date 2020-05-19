import * as fs from 'fs';
import * as stream from 'stream';
import * as vscode from 'vscode';
import type * as proto from './protocol';
import { ServerResponse, TypeScriptRequests } from './typescriptService';
import { Disposable, Reader, Tracer } from './utils/extras';
import { TelemetryReporter } from './utils/telemetry';
import { TypeScriptVersion } from './utils/versionProvider';

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

enum QueueingType {
  Normal = 1,
  LowPriority = 2,
  Fence = 3,
}

interface RequestItem {
  readonly request: proto.Request;
  readonly expectsResponse: boolean;
  readonly isAsync: boolean;
  readonly queueingType: QueueingType;
}

class RequestQueue {
  private readonly queue: RequestItem[] = [];
  private seq = 0;

  get length() {
    return this.queue.length;
  }

  enqueue(item: RequestItem) {
    if (item.queueingType === QueueingType.Normal) {
      let i = this.queue.length - 1;
      while (i >= 0) {
        if (this.queue[i].queueingType !== QueueingType.LowPriority) break;
        --i;
      }
      this.queue.splice(i + 1, 0, item);
    } else this.queue.push(item);
  }

  dequeue(): RequestItem | undefined {
    return this.queue.shift();
  }

  tryDeletePending(seq: number) {
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].request.seq === seq) {
        this.queue.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  createRequest(command: string, args: any): proto.Request {
    return { seq: this.seq++, type: 'request', command, arguments: args };
  }
}

type Resolve<T extends proto.Response> = () => Promise<ServerResponse.Response<T>>;

export class CachedResponse<T extends proto.Response> {
  private reply?: Promise<ServerResponse.Response<T>>;
  private version = -1;
  private doc = '';

  execute(d: vscode.TextDocument, r: Resolve<T>) {
    if (this.reply && this.matches(d)) {
      return (this.reply = this.reply.then((res) =>
        res.type === 'cancelled' ? r() : res
      ));
    }
    return this.reset(d, r);
  }

  private matches(d: vscode.TextDocument) {
    return this.version === d.version && this.doc === d.uri.toString();
  }

  private async reset(d: vscode.TextDocument, r: Resolve<T>) {
    this.version = d.version;
    this.doc = d.uri.toString();
    return (this.reply = r());
  }
}

interface OngoingCanceller {
  tryCancel(seq: number): boolean;
}

export class PipeCanceller implements OngoingCanceller {
  constructor(
    private readonly id: string,
    private readonly pipe: string | undefined,
    private readonly tracer: Tracer
  ) {}

  tryCancel(seq: number) {
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
  readonly logFile: string | undefined;

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
  private static readonly fences = new Set(['change', 'close', 'open', 'updateOpen']);

  private static queueingType(cmd: string, low?: boolean) {
    if (ProcessBased.fences.has(cmd)) return QueueingType.Fence;
    return low ? QueueingType.LowPriority : QueueingType.Normal;
  }

  private readonly reader: Reader<proto.Response>;
  private readonly queue = new RequestQueue();
  private readonly cbs = new CallbackMap<proto.Response>();
  private readonly pendings = new Set<number>();

  constructor(
    private readonly sid: string,
    private readonly proc: ServerProcess,
    public readonly logFile: string | undefined,
    private readonly canceller: OngoingCanceller,
    private readonly version: TypeScriptVersion,
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
  readonly onEvent = this._onEvent.event;

  private readonly _onExit = this.register(new vscode.EventEmitter<any>());
  readonly onExit = this._onExit.event;

  private readonly _onError = this.register(new vscode.EventEmitter<any>());
  readonly onError = this._onError.event;

  get onReaderError() {
    return this.reader.onError;
  }

  private write(r: proto.Request) {
    this.proc.write(r);
  }

  dispose() {
    super.dispose();
    this.cbs.destroy('server disposed');
    this.pendings.clear();
  }

  kill() {
    this.proc.kill();
  }

  private dispatchMessage(m: proto.Message) {
    try {
      switch (m.type) {
        case 'response':
          this.dispatchResponse(m as proto.Response);
          break;
        case 'event':
          const e = m as proto.Event;
          if (e.event === 'requestCompleted') {
            const seq = (e as proto.RequestCompletedEvent).body.request_seq;
            const cb = this.cbs.fetch(seq);
            if (cb) {
              this.tracer.traceRequestCompleted(this.sid, 'requestCompleted', seq, cb);
              cb.onSuccess(undefined);
            }
          } else {
            this.tracer.traceEvent(this.sid, e);
            this._onEvent.fire(e);
          }
          break;
        default:
          throw new Error(`Unknown message type ${m.type}`);
      }
    } finally {
      this.sendNexts();
    }
  }

  private tryCancel(seq: number, cmd: string) {
    try {
      if (this.queue.tryDeletePending(seq)) {
        this.logTrace(`Canceled with ${seq}`);
        return true;
      }
      if (this.canceller.tryCancel(seq)) return true;
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
      } else cb.onError(ServerError.create(this.sid, this.version, r));
    }
  }

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
  ): Promise<ServerResponse.Response<proto.Response>> | undefined {
    const request = this.queue.createRequest(cmd, args);
    const item: RequestItem = {
      request,
      expectsResponse: info.expectsResult,
      isAsync: info.isAsync,
      queueingType: ProcessBased.queueingType(cmd, info.lowPriority),
    };
    let r: Promise<ServerResponse.Response<proto.Response>> | undefined;
    if (info.expectsResult) {
      r = new Promise<ServerResponse.Response<proto.Response>>((res, rej) => {
        this.cbs.add(
          request.seq,
          { onSuccess: res, onError: rej, startTime: Date.now(), isAsync: info.isAsync },
          info.isAsync
        );
        if (info.token) {
          info.token.onCancellationRequested(() => {
            this.tryCancel(request.seq, cmd);
          });
        }
      }).catch((e: Error) => {
        if (e instanceof ServerError) {
          if (!info.token || !info.token.isCancellationRequested) {
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
}

class RequestRouter {
  private static readonly shareds = new Set<keyof TypeScriptRequests>([
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
      readonly preferreds?: ReadonlySet<keyof TypeScriptRequests>;
    }>,
    private readonly delegate: ServerDelegate
  ) {}

  execute(
    cmd: keyof TypeScriptRequests,
    args: any,
    info: {
      isAsync: boolean;
      token?: vscode.CancellationToken;
      expectsResult: boolean;
      lowPriority?: boolean;
    }
  ): Promise<ServerResponse.Response<proto.Response>> | undefined {
    if (RequestRouter.shareds.has(cmd)) {
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
    for (const { preferreds, server } of this.servers) {
      if (!preferreds || preferreds.has(cmd)) return server.executeImpl(cmd, args, info);
    }
    throw new Error(`Could not find server for '${cmd}'`);
  }
}

export class SyntaxRouting extends Disposable implements IServer {
  private static readonly syntactics = new Set<keyof TypeScriptRequests>([
    'navtree',
    'getOutliningSpans',
    'jsxClosingTag',
    'selectionRange',
    'format',
    'formatonkey',
    'docCommentTemplate',
  ]);

  private readonly synServ: IServer;
  private readonly semServ: IServer;
  private readonly router: RequestRouter;

  constructor(servers: { syntax: IServer; semantic: IServer }, delegate: ServerDelegate) {
    super();
    this.synServ = servers.syntax;
    this.semServ = servers.semantic;
    this.router = new RequestRouter(
      [
        { server: this.synServ, preferreds: SyntaxRouting.syntactics },
        { server: this.semServ, preferreds: undefined },
      ],
      delegate
    );
    this.register(this.synServ.onEvent((e) => this._onEvent.fire(e)));
    this.register(this.semServ.onEvent((e) => this._onEvent.fire(e)));
    this.register(
      this.semServ.onExit((e) => {
        this._onExit.fire(e);
        this.synServ.kill();
      })
    );
    this.register(this.semServ.onError((e) => this._onError.fire(e)));
  }

  private readonly _onEvent = this.register(new vscode.EventEmitter<proto.Event>());
  readonly onEvent = this._onEvent.event;

  private readonly _onExit = this.register(new vscode.EventEmitter<any>());
  readonly onExit = this._onExit.event;

  private readonly _onError = this.register(new vscode.EventEmitter<any>());
  readonly onError = this._onError.event;

  get onReaderError() {
    return this.semServ.onReaderError;
  }

  get logFile() {
    return this.semServ.logFile;
  }

  kill(): void {
    this.synServ.kill();
    this.semServ.kill();
  }

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
  ): Promise<ServerResponse.Response<proto.Response>> | undefined {
    return this.router.execute(cmd, args, info);
  }
}

export class GetErrRouting extends Disposable implements IServer {
  private static readonly diagnostics = new Set([
    'configFileDiag',
    'syntaxDiag',
    'semanticDiag',
    'suggestionDiag',
  ]);

  private readonly getErrServ: IServer;
  private readonly mainServ: IServer;
  private readonly router: RequestRouter;

  constructor(servers: { getErr: IServer; primary: IServer }, delegate: ServerDelegate) {
    super();
    this.getErrServ = servers.getErr;
    this.mainServ = servers.primary;
    this.router = new RequestRouter(
      [
        {
          server: this.getErrServ,
          preferreds: new Set<keyof TypeScriptRequests>(['geterr', 'geterrForProject']),
        },
        { server: this.mainServ, preferreds: undefined },
      ],
      delegate
    );
    this.register(
      this.getErrServ.onEvent((e) => {
        if (GetErrRouting.diagnostics.has(e.event)) this._onEvent.fire(e);
      })
    );
    this.register(
      this.mainServ.onEvent((e) => {
        if (!GetErrRouting.diagnostics.has(e.event)) this._onEvent.fire(e);
      })
    );
    this.register(this.getErrServ.onError((e) => this._onError.fire(e)));
    this.register(this.mainServ.onError((e) => this._onError.fire(e)));
    this.register(
      this.mainServ.onExit((e) => {
        this._onExit.fire(e);
        this.getErrServ.kill();
      })
    );
  }

  private readonly _onEvent = this.register(new vscode.EventEmitter<proto.Event>());
  readonly onEvent = this._onEvent.event;

  private readonly _onExit = this.register(new vscode.EventEmitter<any>());
  readonly onExit = this._onExit.event;

  private readonly _onError = this.register(new vscode.EventEmitter<any>());
  readonly onError = this._onError.event;

  get onReaderError() {
    return this.mainServ.onReaderError;
  }

  get logFile() {
    return this.mainServ.logFile;
  }

  kill(): void {
    this.getErrServ.kill();
    this.mainServ.kill();
  }

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

export class ServerError extends Error {
  static create(sid: string, version: TypeScriptVersion, r: proto.Response) {
    const p = parseError(r);
    return new ServerError(sid, version, r, p?.message, p?.stack, p?.sanitized);
  }

  private constructor(
    sid: string,
    public readonly version: TypeScriptVersion,
    private readonly response: proto.Response,
    public readonly msg: string | undefined,
    public readonly stack: string | undefined,
    private readonly sanitized: string | undefined
  ) {
    super(`<${sid}> TypeScript Server Error (${version.displayName})\n${msg}\n${stack}`);
  }

  get errorText() {
    return this.response.message;
  }

  get command() {
    return this.response.command;
  }

  get telemetry() {
    return { command: this.command, sanitized: this.sanitized || '' } as const;
  }
}

function parseError(r: proto.Response) {
  const t = r.message;
  if (t) {
    const pre = 'Error processing request. ';
    if (t.startsWith(pre)) {
      const t2 = t.substr(pre.length);
      const i = t2.indexOf('\n');
      if (i >= 0) {
        const stack = t2.substring(i + 1);
        return {
          message: t2.substring(0, i),
          stack,
          sanitized: sanitizeStack(stack),
        };
      }
    }
  }
  return;
}

function sanitizeStack(msg: string | undefined) {
  if (!msg) return '';
  const r = /(tsserver)?(\.(?:ts|tsx|js|jsx)(?::\d+(?::\d+)?)?)\)?$/gim;
  let stack = '';
  while (true) {
    const match = r.exec(msg);
    if (!match) break;
    stack += `${match[1] || 'suppressed'}${match[2]}\n`;
  }
  return stack;
}
