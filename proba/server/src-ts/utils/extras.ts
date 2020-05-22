/* eslint-disable @typescript-eslint/unbound-method */
import * as fs from 'fs';
import * as path from 'path';
import * as stream from 'stream';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as proto from '../protocol';

import { memoize } from '.';

export const git = 'git';
export const file = 'file';
export const untitled = 'untitled';
export const walkThroughSnippet = 'walkThroughSnippet';

export const schemes = [file, untitled, walkThroughSnippet];

export function isSupportedScheme(s: string) {
  return schemes.includes(s);
}

const noopDisposable = vscode.Disposable.from();

export const nulToken: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => noopDisposable,
};

export abstract class Disposable {
  protected dispos?: vscode.Disposable[] = [];

  protected get isDisposed() {
    return !!this.dispos;
  }

  protected register<T extends vscode.Disposable>(d: T) {
    if (this.dispos) this.dispos.push(d);
    else d.dispose();
    return d;
  }

  dispose() {
    if (this.dispos) {
      disposeAll(this.dispos);
      this.dispos = undefined;
    }
  }
}

export function disposeAll(ds: vscode.Disposable[]) {
  while (ds.length) {
    const d = ds.pop();
    if (d) d.dispose();
  }
}

export interface Command {
  readonly id: string | string[];
  execute(..._: any[]): void;
}

export class Commands {
  private readonly cs = new Map<string, vscode.Disposable>();

  dispose() {
    for (const c of this.cs.values()) {
      c.dispose();
    }
    this.cs.clear();
  }

  register<T extends Command>(c: T) {
    const cs = this.cs;
    for (const i of Array.isArray(c.id) ? c.id : [c.id]) {
      if (!cs.has(i)) cs.set(i, vscode.commands.registerCommand(i, c.execute, c));
    }
    return c;
  }
}

export interface Lazy<T> {
  value: T;
  hasValue: boolean;
  map<R>(f: (x: T) => R): Lazy<R>;
}

class LazyValue<T> implements Lazy<T> {
  private _hasValue = false;
  private _value?: T;

  constructor(private readonly _getValue: () => T) {}

  get value(): T {
    if (!this._hasValue) {
      this._hasValue = true;
      this._value = this._getValue();
    }
    return this._value;
  }

  get hasValue() {
    return this._hasValue;
  }

  map<R>(f: (x: T) => R): Lazy<R> {
    return new LazyValue(() => f(this.value));
  }
}

export function lazy<T>(getValue: () => T): Lazy<T> {
  return new LazyValue<T>(getValue);
}

export interface ITask<T> {
  (): T;
}

export class Delayer<T> {
  defaultDelay: number;
  private timeout: any; // Timer
  private completionPromise: Promise<T | null> | null;
  private onSuccess: ((value?: T | Thenable<T>) => void) | null;
  private task: ITask<T> | null;

  constructor(defaultDelay: number) {
    this.defaultDelay = defaultDelay;
    this.timeout = null;
    this.completionPromise = null;
    this.onSuccess = null;
    this.task = null;
  }

  trigger(task: ITask<T>, delay: number = this.defaultDelay): Promise<T | null> {
    this.task = task;
    if (delay >= 0) this.cancelTimeout();
    if (!this.completionPromise) {
      this.completionPromise = new Promise<T>((resolve) => {
        this.onSuccess = resolve;
      }).then(() => {
        this.completionPromise = null;
        this.onSuccess = null;
        const result = this.task && this.task();
        this.task = null;
        return result;
      });
    }
    if (delay >= 0 || this.timeout === null) {
      this.timeout = setTimeout(
        () => {
          this.timeout = null;
          if (this.onSuccess) this.onSuccess(undefined);
        },
        delay >= 0 ? delay : this.defaultDelay
      );
    }
    return this.completionPromise;
  }

  private cancelTimeout() {
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

export class ResourceMap<T> {
  private readonly _map = new Map<string, { resource: vscode.Uri; value: T }>();

  constructor(
    private readonly toKey: (r: vscode.Uri) => string | undefined = (r) => r.fsPath
  ) {}

  get size() {
    return this._map.size;
  }

  has(r: vscode.Uri) {
    const k = this.toKey(r);
    return !!k && this._map.has(k);
  }

  get(r: vscode.Uri): T | undefined {
    const k = this.toKey(r);
    if (!k) return;
    const e = this._map.get(k);
    return e ? e.value : undefined;
  }

  set(r: vscode.Uri, value: T) {
    const k = this.toKey(r);
    if (!k) return;
    const e = this._map.get(k);
    if (e) e.value = value;
    else this._map.set(k, { resource: r, value });
  }

  delete(r: vscode.Uri) {
    const k = this.toKey(r);
    if (k) this._map.delete(k);
  }

  clear() {
    this._map.clear();
  }

  get values(): Iterable<T> {
    return Array.from(this._map.values()).map((x) => x.value);
  }

  get entries(): Iterable<{ resource: vscode.Uri; value: T }> {
    return this._map.values();
  }
}

export class PathResolver {
  static asWorkspacePath(relative: string): string | undefined {
    for (const r of vscode.workspace.workspaceFolders || []) {
      const ps = [`./${r.name}/`, `${r.name}/`, `.\\${r.name}\\`, `${r.name}\\`];
      for (const p of ps) {
        if (relative.startsWith(p)) {
          return path.join(r.uri.fsPath, relative.replace(p, ''));
        }
      }
    }
    return;
  }
}

const localize = nls.loadMessageBundle();

type Level = 'Trace' | 'Info' | 'Error';

export class Logger {
  @memoize
  private get output(): vscode.OutputChannel {
    return vscode.window.createOutputChannel(localize('channelName', 'TypeScript'));
  }

  private data2String(d: any): string {
    if (d instanceof Error) return d.stack || d.message;
    if (d.success === false && d.message) return d.message;
    return d.toString();
  }

  info(m: string, d?: any) {
    this.logLevel('Info', m, d);
  }

  error(m: string, d?: any) {
    if (d && d.message === 'No content available.') return;
    this.logLevel('Error', m, d);
  }

  logLevel(l: Level, m: string, d?: any) {
    this.output.appendLine(`[${l}  - ${this.now()}] ${m}`);
    if (d) this.output.appendLine(this.data2String(d));
  }

  private now(): string {
    const now = new Date();
    return (
      padLeft(now.getUTCHours() + '', 2, '0') +
      ':' +
      padLeft(now.getMinutes() + '', 2, '0') +
      ':' +
      padLeft(now.getUTCSeconds() + '', 2, '0') +
      '.' +
      now.getMilliseconds()
    );
  }
}

function padLeft(s: string, n: number, pad = ' ') {
  return pad.repeat(Math.max(0, n - s.length)) + s;
}

enum Trace {
  Off,
  Messages,
  Verbose,
}

namespace Trace {
  export function fromString(s: string) {
    switch (s.toLowerCase()) {
      case 'off':
        return Trace.Off;
      case 'messages':
        return Trace.Messages;
      case 'verbose':
        return Trace.Verbose;
      default:
        return Trace.Off;
    }
  }
}

interface RequestExecutionMetadata {
  readonly queuingStartTime: number;
}

export class Tracer {
  private trace?: Trace;

  constructor(private readonly logger: Logger) {
    this.updateConfig();
  }

  updateConfig() {
    this.trace = Tracer.readTrace();
  }

  private static readTrace() {
    let r: Trace = Trace.fromString(
      vscode.workspace.getConfiguration().get<string>('typescript.tsserver.trace', 'off')
    );
    if (r === Trace.Off && !!process.env.TSS_TRACE) r = Trace.Messages;
    return r;
  }

  traceRequest(id: string, req: proto.Request, response: boolean, len: number) {
    if (this.trace === Trace.Off) return;
    let data: string | undefined = undefined;
    if (this.trace === Trace.Verbose && req.arguments) {
      data = `Arguments: ${JSON.stringify(req.arguments, null, 4)}`;
    }
    this.logTrace(
      id,
      `Sending request: ${req.command} (${req.seq}). Response expected: ${
        response ? 'yes' : 'no'
      }. Current queue length: ${len}`,
      data
    );
  }

  traceResponse(id: string, r: proto.Response, meta: RequestExecutionMetadata) {
    if (this.trace === Trace.Off) return;
    let d: string | undefined = undefined;
    if (this.trace === Trace.Verbose && r.body) {
      d = `Result: ${JSON.stringify(r.body, null, 4)}`;
    }
    this.logTrace(
      id,
      `Response received: ${r.command} (${r.request_seq}). Request took ${
        Date.now() - meta.queuingStartTime
      } ms. Success: ${r.success} ${!r.success ? '. Message: ' + r.message : ''}`,
      d
    );
  }

  traceRequestCompleted(
    id: string,
    cmd: string,
    seq: number,
    meta: RequestExecutionMetadata
  ) {
    if (this.trace === Trace.Off) return;
    this.logTrace(
      id,
      `Async response received: ${cmd} (${seq}). Request took ${
        Date.now() - meta.queuingStartTime
      } ms.`
    );
  }

  traceEvent(id: string, e: proto.Event) {
    if (this.trace === Trace.Off) return;
    let d: string | undefined = undefined;
    if (this.trace === Trace.Verbose && e.body) {
      d = `Data: ${JSON.stringify(e.body, null, 4)}`;
    }
    this.logTrace(id, `Event received: ${e.event} (${e.seq}).`, d);
  }

  logTrace(id: string, m: string, d?: any) {
    if (this.trace !== Trace.Off) {
      this.logger.logLevel('Trace', `<${id}> ${m}`, d);
    }
  }
}

const defSize = 8192;
const contentLen = 'Content-Length: ';
const contentLenSize: number = Buffer.byteLength(contentLen, 'utf8');
const blank: number = Buffer.from(' ', 'utf8')[0];
const backR: number = Buffer.from('\r', 'utf8')[0];
const backN: number = Buffer.from('\n', 'utf8')[0];

class ProtocolBuffer {
  private index = 0;
  private buf: Buffer = Buffer.allocUnsafe(defSize);

  append(d: string | Buffer) {
    let r: Buffer | undefined;
    if (Buffer.isBuffer(d)) r = d;
    else r = Buffer.from(d, 'utf8');
    if (this.buf.length - this.index >= r.length) {
      r.copy(this.buf, this.index, 0, r.length);
    } else {
      const s = (Math.ceil((this.index + r.length) / defSize) + 1) * defSize;
      if (this.index === 0) {
        this.buf = Buffer.allocUnsafe(s);
        r.copy(this.buf, 0, 0, r.length);
      } else {
        this.buf = Buffer.concat([this.buf.slice(0, this.index), r], s);
      }
    }
    this.index += r.length;
  }

  tryReadContentLength() {
    let r = -1;
    let i = 0;
    while (
      i < this.index &&
      (this.buf[i] === blank || this.buf[i] === backR || this.buf[i] === backN)
    ) {
      i++;
    }
    if (this.index < i + contentLenSize) return r;
    i += contentLenSize;
    const s = i;
    while (i < this.index && this.buf[i] !== backR) {
      i++;
    }
    if (
      i + 3 >= this.index ||
      this.buf[i + 1] !== backN ||
      this.buf[i + 2] !== backR ||
      this.buf[i + 3] !== backN
    ) {
      return r;
    }
    const d = this.buf.toString('utf8', s, i);
    r = parseInt(d);
    this.buf = this.buf.slice(i + 4);
    this.index = this.index - (i + 4);
    return r;
  }

  tryReadContent(len: number): string | null {
    if (this.index < len) return null;
    const r = this.buf.toString('utf8', 0, len);
    let s = len;
    while (s < this.index && (this.buf[s] === backR || this.buf[s] === backN)) {
      s++;
    }
    this.buf.copy(this.buf, 0, s);
    this.index = this.index - s;
    return r;
  }
}

export class Reader<T> extends Disposable {
  private readonly buf = new ProtocolBuffer();
  private nextLen = -1;

  constructor(readable: stream.Readable) {
    super();
    readable.on('data', (d) => this.onLengthData(d));
  }

  private readonly _onError = this.register(new vscode.EventEmitter<Error>());
  readonly onError = this._onError.event;

  private readonly _onData = this.register(new vscode.EventEmitter<T>());
  readonly onData = this._onData.event;

  private onLengthData(d: Buffer | string) {
    if (this.isDisposed) return;
    try {
      this.buf.append(d);
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (this.nextLen === -1) {
          this.nextLen = this.buf.tryReadContentLength();
          if (this.nextLen === -1) return;
        }
        const m = this.buf.tryReadContent(this.nextLen);
        if (m === null) return;
        this.nextLen = -1;
        const j = JSON.parse(m);
        this._onData.fire(j);
      }
    } catch (e) {
      this._onError.fire(e);
    }
  }
}
