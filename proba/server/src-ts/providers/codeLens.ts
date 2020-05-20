import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as proto from '../protocol';
import { IServiceClient } from '../service';
import { escapeRegExp } from '../utils';
import * as qc from '../utils/convert';
import { CachedResponse } from '../server';

const localize = nls.loadMessageBundle();

export class RefsCodeLens extends vscode.CodeLens {
  constructor(public doc: vscode.Uri, public file: string, r: vscode.Range) {
    super(r);
  }
}

export abstract class BaseCodeLens implements vscode.CodeLensProvider {
  static readonly cancelled: vscode.Command = {
    title: '',
    command: '',
  };

  static readonly error: vscode.Command = {
    title: localize('referenceErrorLabel', 'Could not determine references'),
    command: '',
  };

  private onDidChangeCodeLensesEmitter = new vscode.EventEmitter<void>();

  constructor(
    protected client: IServiceClient,
    private cached: CachedResponse<proto.NavTreeResponse>
  ) {}

  get onDidChangeCodeLenses() {
    return this.onDidChangeCodeLensesEmitter.event;
  }

  async provideCodeLenses(
    d: vscode.TextDocument,
    ct: vscode.CancellationToken
  ): Promise<vscode.CodeLens[]> {
    const f = this.client.toOpenedPath(d);
    if (!f) return [];
    const r = await this.cached.execute(d, () =>
      this.client.execute('navtree', { file: f }, ct)
    );
    if (r.type !== 'response') return [];
    const t = r.body;
    const rs: vscode.Range[] = [];
    if (t && t.childItems) {
      t.childItems.forEach((i) => this.walkNavTree(d, i, null, rs));
    }
    return rs.map((s) => new RefsCodeLens(d.uri, f, s));
  }

  protected abstract extractSymbol(
    d: vscode.TextDocument,
    n: proto.NavigationTree,
    parent: proto.NavigationTree | null
  ): vscode.Range | null;

  private walkNavTree(
    d: vscode.TextDocument,
    n: proto.NavigationTree,
    parent: proto.NavigationTree | null,
    rs: vscode.Range[]
  ) {
    if (!n) return;
    const r = this.extractSymbol(d, n, parent);
    if (r) rs.push(r);
    (n.childItems || []).forEach((c) => this.walkNavTree(d, c, n, rs));
  }
}

export function getSymbolRange(
  d: vscode.TextDocument,
  n: proto.NavigationTree
): vscode.Range | null {
  if (n.nameSpan) return qc.Range.fromTextSpan(n.nameSpan);
  const s = n.spans && n.spans[0];
  if (!s) return null;
  const r = qc.Range.fromTextSpan(s);
  const t = d.getText(r);
  const re = new RegExp(`^(.*?(\\b|\\W))${escapeRegExp(n.text || '')}(\\b|\\W)`, 'gm');
  const m = re.exec(t);
  const l = m ? m.index + m[1].length : 0;
  const o = d.offsetAt(new vscode.Position(r.start.line, r.start.character)) + l;
  return new vscode.Range(d.positionAt(o), d.positionAt(o + n.text.length));
}
