/* eslint-disable @typescript-eslint/unbound-method */
import * as vscode from 'vscode';
import type * as proto from '../protocol';
import { IServiceClient } from '../service';
import { coalesce } from '../utils';
import { Delayer, Disposable, nulToken, ResourceMap } from '../utils/extras';
import * as languageModeIds from '../utils/language';
import * as qc from '../utils/convert';

const enum Kind {
  TypeScript = 1,
  JavaScript = 2,
}

const enum State {
  Initial = 1,
  Open = 2,
  Closed = 2,
}

function mode2Kind(mode: string): 'TS' | 'TSX' | 'JS' | 'JSX' | undefined {
  switch (mode) {
    case languageModeIds.typescript:
      return 'TS';
    case languageModeIds.typescriptreact:
      return 'TSX';
    case languageModeIds.javascript:
      return 'JS';
    case languageModeIds.javascriptreact:
      return 'JSX';
  }
  return;
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

type BufferOp = CloseOp | OpenOp | ChangeOp;

class Synchronizer {
  private readonly pending = new ResourceMap<BufferOp>();

  constructor(private readonly client: IServiceClient) {}

  open(r: vscode.Uri, args: proto.OpenRequestArgs) {
    this.update(r, new OpenOp(args));
  }

  close(r: vscode.Uri, filepath: string) {
    return this.update(r, new CloseOp(filepath));
  }

  change(r: vscode.Uri, f: string, es: readonly vscode.TextDocumentContentChangeEvent[]) {
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
        nulToken,
        { nonRecoverable: true }
      );
      this.pending.clear();
    }
  }

  private update(r: vscode.Uri, op: BufferOp) {
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

class Buffer {
  private state = State.Initial;

  constructor(
    private readonly doc: vscode.TextDocument,
    public readonly filepath: string,
    private readonly client: IServiceClient,
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
      (args as any).plugins = tsPluginsForDocument.map((p) => p.name);
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
      case languageModeIds.javascript:
      case languageModeIds.javascriptreact:
        return Kind.JavaScript;
      case languageModeIds.typescript:
      case languageModeIds.typescriptreact:
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

  onContentChanged(es: readonly vscode.TextDocumentContentChangeEvent[]) {
    if (this.state !== State.Open) {
      console.error(`Unexpected state: ${this.state}`);
    }
    this.sync.change(this.resource, this.filepath, es);
  }
}

class BufferMap extends ResourceMap<Buffer> {
  forPath(p: string) {
    return this.get(vscode.Uri.file(p));
  }
  get allBuffers() {
    return this.values;
  }
}

class Diags extends ResourceMap<number> {
  orderedFiles(): ResourceMap<void> {
    const rs = Array.from(this.entries)
      .sort((a, b) => a.value - b.value)
      .map((entry) => entry.resource);
    const m = new ResourceMap<void>();
    for (const r of rs) {
      m.set(r, undefined);
    }
    return m;
  }
}

class GetErrRequest {
  static executeGetErrRequest(
    client: IServiceClient,
    files: ResourceMap<void>,
    onDone: () => void
  ) {
    return new GetErrRequest(client, files, onDone);
  }

  private done = false;
  private readonly ct: vscode.CancellationTokenSource = new vscode.CancellationTokenSource();

  private constructor(
    client: IServiceClient,
    public readonly files: ResourceMap<void>,
    onDone: () => void
  ) {
    const fs = coalesce(
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

export class BufferSync extends Disposable {
  private validateJs = true;
  private validateTs = true;
  private readonly modes: Set<string>;
  private readonly bufs: BufferMap;
  private readonly diags: Diags;
  private readonly delayer = new Delayer<any>(300);
  private pendingGetErr: GetErrRequest | undefined;
  private listening = false;
  private readonly sync: Synchronizer;

  constructor(private readonly client: IServiceClient, modes: readonly string[]) {
    super();
    this.modes = new Set<string>(modes);
    const n = (r: vscode.Uri) => this.client.toNormPath(r);
    this.bufs = new BufferMap(n);
    this.diags = new Diags(n);
    this.sync = new Synchronizer(client);
    this.updateConfig();
    vscode.workspace.onDidChangeConfiguration(this.updateConfig, this, this.dispos);
  }

  private readonly _onDelete = this.register(new vscode.EventEmitter<vscode.Uri>());
  readonly onDelete = this._onDelete.event;

  private readonly _onWillChange = this.register(new vscode.EventEmitter<vscode.Uri>());
  readonly onWillChange = this._onWillChange.event;

  listen() {
    if (this.listening) return;
    this.listening = true;
    vscode.workspace.onDidOpenTextDocument(this.openTextDocument, this, this.dispos);
    vscode.workspace.onDidCloseTextDocument(
      this.onDidCloseTextDocument,
      this,
      this.dispos
    );
    vscode.workspace.onDidChangeTextDocument(
      this.onDidChangeTextDocument,
      this,
      this.dispos
    );
    vscode.window.onDidChangeVisibleTextEditors(
      (e) => {
        for (const { document } of e) {
          const b = this.bufs.get(document.uri);
          if (b) this.requestDiags(b);
        }
      },
      this,
      this.dispos
    );
    vscode.workspace.textDocuments.forEach(this.openTextDocument, this);
  }

  handles(r: vscode.Uri) {
    return this.bufs.has(r);
  }

  ensureHasBuffer(r: vscode.Uri) {
    if (this.bufs.has(r)) return true;
    const t = vscode.workspace.textDocuments.find(
      (d) => d.uri.toString() === r.toString()
    );
    if (t) return this.openTextDocument(t);
    return false;
  }

  toVsCodeResource(r: vscode.Uri) {
    const p = this.client.toNormPath(r);
    for (const b of this.bufs.allBuffers) {
      if (b.filepath === p) return b.resource;
    }
    return r;
  }

  toResource(p: string) {
    const b = this.bufs.forPath(p);
    if (b) return b.resource;
    return vscode.Uri.file(p);
  }

  reset() {
    this.pendingGetErr?.cancel();
    this.diags.clear();
    this.sync.reset();
  }

  reinitialize() {
    this.reset();
    for (const b of this.bufs.allBuffers) {
      b.open();
    }
  }

  openTextDocument(d: vscode.TextDocument) {
    if (!this.modes.has(d.languageId)) return false;
    const r = d.uri;
    const p = this.client.toNormPath(r);
    if (!p) return false;
    if (this.bufs.has(r)) return true;
    const b = new Buffer(d, p, this.client, this.sync);
    this.bufs.set(r, b);
    b.open();
    this.requestDiags(b);
    return true;
  }

  closeResource(r: vscode.Uri) {
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

  beforeCommand(c: string) {
    this.sync.beforeCommand(c);
  }

  private onDidCloseTextDocument(d: vscode.TextDocument) {
    this.closeResource(d.uri);
  }

  private onDidChangeTextDocument(e: vscode.TextDocumentChangeEvent) {
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

  requestAllDiags() {
    for (const b of this.bufs.allBuffers) {
      if (this.shouldValidate(b)) this.diags.set(b.resource, Date.now());
    }
    this.triggerDiags();
  }

  getErr(rs: vscode.Uri[]): any {
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

  private requestDiags(b: Buffer) {
    if (!this.shouldValidate(b)) return false;
    this.diags.set(b.resource, Date.now());
    const delay = Math.min(Math.max(Math.ceil(b.lineCount / 20), 300), 800);
    this.triggerDiags(delay);
    return true;
  }

  hasDiags(r: vscode.Uri) {
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
    const js = vscode.workspace.getConfiguration('javascript', null);
    const ts = vscode.workspace.getConfiguration('typescript', null);
    this.validateJs = js.get<boolean>('validate.enable', true);
    this.validateTs = ts.get<boolean>('validate.enable', true);
  }

  private shouldValidate(b: Buffer) {
    switch (b.kind) {
      case Kind.JavaScript:
        return this.validateJs;
      case Kind.TypeScript:
      default:
        return this.validateTs;
    }
  }
}
