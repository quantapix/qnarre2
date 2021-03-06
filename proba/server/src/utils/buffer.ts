/* eslint-disable @typescript-eslint/unbound-method */
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qc from './convert';
import * as ql from './language';
import * as qs from '../service';
import * as qu from '.';
import * as qx from './extras';

const enum Kind {
  TypeScript = 1,
  JavaScript = 2,
}

const enum State {
  Initial = 1,
  Open = 2,
  Closed = 2,
}

const enum OpType {
  Close,
  Open,
  Change,
}

class CloseOp {
  readonly type = OpType.Close;
  constructor(public readonly args: string) {}
}

class OpenOp {
  readonly type = OpType.Open;
  constructor(public readonly args: proto.OpenRequestArgs) {}
}

class ChangeOp {
  readonly type = OpType.Change;
  constructor(public readonly args: proto.FileCodeEdits) {}
}

type BufOp = CloseOp | OpenOp | ChangeOp;

class Synchronizer {
  private readonly pending = new qx.ResourceMap<BufOp>();

  constructor(private readonly client: qs.IServiceClient) {}

  open(r: vsc.Uri, args: proto.OpenRequestArgs) {
    this.update(r, new OpenOp(args));
  }

  close(r: vsc.Uri, filepath: string) {
    return this.update(r, new CloseOp(filepath));
  }

  change(r: vsc.Uri, f: string, es: readonly vsc.TextDocumentContentChangeEvent[]) {
    if (!es.length) return;
    this.update(
      r,
      new ChangeOp({
        fileName: f,
        textChanges: es
          .map(
            (e): proto.CodeEdit => ({
              newText: e.text,
              start: qc.Position.toLocation(e.range.start),
              end: qc.Position.toLocation(e.range.end),
            })
          )
          .reverse(),
      })
    );
  }

  reset() {
    this.pending.clear();
  }

  beforeCommand(c: string) {
    if (c === 'updateOpen') return;
    this.flush();
  }

  private flush() {
    if (this.pending.size > 0) {
      const closedFiles: string[] = [];
      const openFiles: proto.OpenRequestArgs[] = [];
      const changedFiles: proto.FileCodeEdits[] = [];
      for (const o of this.pending.values) {
        switch (o.type) {
          case OpType.Change:
            changedFiles.push(o.args);
            break;
          case OpType.Open:
            openFiles.push(o.args);
            break;
          case OpType.Close:
            closedFiles.push(o.args);
            break;
        }
      }
      this.client.execute(
        'updateOpen',
        { changedFiles, closedFiles, openFiles },
        qx.nulToken,
        { nonRecoverable: true }
      );
      this.pending.clear();
    }
  }

  private update(r: vsc.Uri, op: BufOp) {
    const existing = this.pending.get(r);
    switch (op.type) {
      case OpType.Close:
        switch (existing?.type) {
          case OpType.Open:
            this.pending.delete(r);
            return false;
        }
        break;
    }
    if (this.pending.has(r)) this.flush();
    this.pending.set(r, op);
    return true;
  }
}

class Buf {
  private state = State.Initial;

  constructor(
    private readonly doc: vsc.TextDocument,
    public readonly filepath: string,
    private readonly client: qs.IServiceClient,
    private readonly sync: Synchronizer
  ) {}

  open() {
    const args: proto.OpenRequestArgs = {
      file: this.filepath,
      fileContent: this.doc.getText(),
      projectRootPath: this.client.workspaceRootFor(this.doc.uri),
    };
    const k = mode2Kind(this.doc.languageId);
    if (k) args.scriptKindName = k;
    const tsPluginsForDocument = this.client.plugins.all.filter((x) =>
      x.languages.includes(this.doc.languageId)
    );
    if (tsPluginsForDocument.length) {
      args.plugins = tsPluginsForDocument.map((p) => p.name);
    }
    this.sync.open(this.resource, args);
    this.state = State.Open;
  }

  get resource() {
    return this.doc.uri;
  }

  get lineCount() {
    return this.doc.lineCount;
  }

  get kind(): Kind {
    switch (this.doc.languageId) {
      case ql.javascript:
      case ql.javascriptreact:
        return Kind.JavaScript;
      case ql.typescript:
      case ql.typescriptreact:
      default:
        return Kind.TypeScript;
    }
  }

  close() {
    if (this.state !== State.Open) {
      this.state = State.Closed;
      return false;
    }
    this.state = State.Closed;
    return this.sync.close(this.resource, this.filepath);
  }

  onContentChanged(es: readonly vsc.TextDocumentContentChangeEvent[]) {
    if (this.state !== State.Open) {
      console.error(`Unexpected state: ${this.state}`);
    }
    this.sync.change(this.resource, this.filepath, es);
  }
}

function mode2Kind(mode: string): 'TS' | 'TSX' | 'JS' | 'JSX' | undefined {
  switch (mode) {
    case ql.typescript:
      return 'TS';
    case ql.typescriptreact:
      return 'TSX';
    case ql.javascript:
      return 'JS';
    case ql.javascriptreact:
      return 'JSX';
  }
  return;
}

class BufMap extends qx.ResourceMap<Buf> {
  forPath(p: string) {
    return this.get(vsc.Uri.file(p));
  }
  get allBufs() {
    return this.values;
  }
}

class Diags extends qx.ResourceMap<number> {
  orderedFiles(): qx.ResourceMap<void> {
    const rs = Array.from(this.entries)
      .sort((a, b) => a.value - b.value)
      .map((entry) => entry.resource);
    const m = new qx.ResourceMap<void>();
    for (const r of rs) {
      m.set(r, undefined);
    }
    return m;
  }
}

class GetErrRequest {
  static executeGetErrRequest(
    client: qs.IServiceClient,
    files: qx.ResourceMap<void>,
    onDone: () => void
  ) {
    return new GetErrRequest(client, files, onDone);
  }

  private done = false;
  private readonly ct: vsc.CancellationTokenSource = new vsc.CancellationTokenSource();

  private constructor(
    client: qs.IServiceClient,
    public readonly files: qx.ResourceMap<void>,
    onDone: () => void
  ) {
    const fs = qu.coalesce(
      Array.from(files.entries).map((e) => client.toNormPath(e.resource))
    );
    if (!fs.length) {
      this.done = true;
      onDone();
    } else {
      const r = client.configuration.enableProjectDiagnostics
        ? client.executeAsync(
            'geterrForProject',
            { delay: 0, file: fs[0] },
            this.ct.token
          )
        : client.executeAsync('geterr', { delay: 0, files: fs }, this.ct.token);
      r.finally(() => {
        if (this.done) return;
        this.done = true;
        onDone();
      });
    }
  }

  cancel() {
    if (!this.done) this.ct.cancel();
    this.ct.dispose();
  }
}

export class Buffer extends qx.Disposable {
  private validateJs = true;
  private validateTs = true;
  private readonly modes: Set<string>;
  private readonly bufs: BufMap;
  private readonly diags: Diags;
  private readonly delayer = new qx.Delayer<any>(300);
  private pendingGetErr: GetErrRequest | undefined;
  private listening = false;
  private readonly sync: Synchronizer;

  constructor(private readonly client: qs.IServiceClient, modes: readonly string[]) {
    super();
    this.modes = new Set<string>(modes);
    const n = (r: vsc.Uri) => this.client.toNormPath(r);
    this.bufs = new BufMap(n);
    this.diags = new Diags(n);
    this.sync = new Synchronizer(client);
    this.updateConfig();
    vsc.workspace.onDidChangeConfiguration(this.updateConfig, this, this.dispos);
  }

  private readonly _onDelete = this.register(new vsc.EventEmitter<vsc.Uri>());
  readonly onDelete = this._onDelete.event;

  private readonly _onWillChange = this.register(new vsc.EventEmitter<vsc.Uri>());
  readonly onWillChange = this._onWillChange.event;

  listen(): void {
    if (this.listening) return;
    this.listening = true;
    vsc.workspace.onDidOpenTextDocument(this.openTextDocument, this, this.dispos);
    vsc.workspace.onDidCloseTextDocument(this.onDidCloseTextDocument, this, this.dispos);
    vsc.workspace.onDidChangeTextDocument(
      this.onDidChangeTextDocument,
      this,
      this.dispos
    );
    vsc.window.onDidChangeVisibleTextEditors(
      (e) => {
        for (const { document } of e) {
          const b = this.bufs.get(document.uri);
          if (b) this.requestDiags(b);
        }
      },
      this,
      this.dispos
    );
    vsc.workspace.textDocuments.forEach(this.openTextDocument, this);
  }

  handles(r: vsc.Uri): boolean {
    return this.bufs.has(r);
  }

  ensureHasBuffer(r: vsc.Uri): boolean {
    if (this.bufs.has(r)) return true;
    const t = vsc.workspace.textDocuments.find((d) => d.uri.toString() === r.toString());
    if (t) return this.openTextDocument(t);
    return false;
  }

  toVsCodeResource(r: vsc.Uri): vsc.Uri {
    const p = this.client.toNormPath(r);
    for (const b of this.bufs.allBufs) {
      if (b.filepath === p) return b.resource;
    }
    return r;
  }

  toResource(p: string): vsc.Uri {
    const b = this.bufs.forPath(p);
    if (b) return b.resource;
    return vsc.Uri.file(p);
  }

  reset(): void {
    this.pendingGetErr?.cancel();
    this.diags.clear();
    this.sync.reset();
  }

  reinitialize(): void {
    this.reset();
    for (const b of this.bufs.allBufs) {
      b.open();
    }
  }

  openTextDocument(d: vsc.TextDocument): boolean {
    if (!this.modes.has(d.languageId)) return false;
    const r = d.uri;
    const p = this.client.toNormPath(r);
    if (!p) return false;
    if (this.bufs.has(r)) return true;
    const b = new Buf(d, p, this.client, this.sync);
    this.bufs.set(r, b);
    b.open();
    this.requestDiags(b);
    return true;
  }

  closeResource(r: vsc.Uri): void {
    const b = this.bufs.get(r);
    if (!b) return;
    this.diags.delete(r);
    this.pendingGetErr?.files.delete(r);
    this.bufs.delete(r);
    const wasOpen = b.close();
    this._onDelete.fire(r);
    if (wasOpen) this.requestAllDiags();
  }

  interuptGetErr<R>(f: () => R): R {
    if (!this.pendingGetErr || this.client.configuration.enableProjectDiagnostics) {
      return f();
    }
    this.pendingGetErr.cancel();
    this.pendingGetErr = undefined;
    const r = f();
    this.triggerDiags();
    return r;
  }

  beforeCommand(c: string): void {
    this.sync.beforeCommand(c);
  }

  private onDidCloseTextDocument(d: vsc.TextDocument) {
    this.closeResource(d.uri);
  }

  private onDidChangeTextDocument(e: vsc.TextDocumentChangeEvent) {
    const b = this.bufs.get(e.document.uri);
    if (!b) return;
    this._onWillChange.fire(b.resource);
    b.onContentChanged(e.contentChanges);
    if (!this.requestDiags(b) && this.pendingGetErr) {
      this.pendingGetErr.cancel();
      this.pendingGetErr = undefined;
      this.triggerDiags();
    }
  }

  requestAllDiags(): void {
    for (const b of this.bufs.allBufs) {
      if (this.shouldValidate(b)) this.diags.set(b.resource, Date.now());
    }
    this.triggerDiags();
  }

  getErr(rs: vsc.Uri[]): any {
    const hr = rs.filter((r) => this.handles(r));
    if (!hr.length) return;
    for (const r of hr) {
      this.diags.set(r, Date.now());
    }
    this.triggerDiags();
  }

  private triggerDiags(delay = 200) {
    this.delayer.trigger(() => {
      this.sendDiags();
    }, delay);
  }

  private requestDiags(b: Buf) {
    if (!this.shouldValidate(b)) return false;
    this.diags.set(b.resource, Date.now());
    const delay = Math.min(Math.max(Math.ceil(b.lineCount / 20), 300), 800);
    this.triggerDiags(delay);
    return true;
  }

  hasDiags(r: vsc.Uri): boolean {
    return this.diags.has(r);
  }

  private sendDiags() {
    const os = this.diags.orderedFiles();
    if (this.pendingGetErr) {
      this.pendingGetErr.cancel();
      for (const { resource } of this.pendingGetErr.files.entries) {
        if (this.bufs.get(resource)) os.set(resource, undefined);
      }
      this.pendingGetErr = undefined;
    }
    for (const b of this.bufs.values) {
      os.set(b.resource, undefined);
    }
    if (os.size) {
      const e = (this.pendingGetErr = GetErrRequest.executeGetErrRequest(
        this.client,
        os,
        () => {
          if (this.pendingGetErr === e) this.pendingGetErr = undefined;
        }
      ));
    }
    this.diags.clear();
  }

  private updateConfig() {
    const js = vsc.workspace.getConfiguration('javascript', null);
    const ts = vsc.workspace.getConfiguration('typescript', null);
    this.validateJs = js.get<boolean>('validate.enable', true);
    this.validateTs = ts.get<boolean>('validate.enable', true);
  }

  private shouldValidate(b: Buf) {
    switch (b.kind) {
      case Kind.JavaScript:
        return this.validateJs;
      case Kind.TypeScript:
      default:
        return this.validateTs;
    }
  }
}
