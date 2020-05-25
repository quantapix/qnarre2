import * as cproto from '../protocol.const';
import * as nls from 'vscode-nls';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import { CachedResponse } from '../server';
import * as qc from '../utils/convert';
import * as qr from '../utils/registration';
import * as qs from '../service';
import * as qu from '../utils';

const localize = nls.loadMessageBundle();

export class RefsCodeLens extends vsc.CodeLens {
  constructor(public doc: vsc.Uri, public file: string, r: vsc.Range) {
    super(r);
  }
}

export abstract class CodeLens implements vsc.CodeLensProvider {
  static readonly cancelled: vsc.Command = { title: '', command: '' };
  static readonly error: vsc.Command = {
    title: localize('referenceErrorLabel', 'Could not determine references'),
    command: '',
  };

  private onDidChangeCodeLensesEmitter = new vsc.EventEmitter<void>();

  constructor(
    protected client: qs.IServiceClient,
    private cached: CachedResponse<proto.NavTreeResponse>
  ) {}

  get onDidChangeCodeLenses() {
    return this.onDidChangeCodeLensesEmitter.event;
  }

  async provideCodeLenses(
    d: vsc.TextDocument,
    ct: vsc.CancellationToken
  ): Promise<vsc.CodeLens[]> {
    const f = this.client.toOpenedPath(d);
    if (!f) return [];
    const r = await this.cached.execute(d, () =>
      this.client.execute('navtree', { file: f }, ct)
    );
    if (r.type !== 'response') return [];
    const t = r.body;
    const rs: vsc.Range[] = [];
    if (t && t.childItems) {
      t.childItems.forEach((i) => this.walk(d, i, undefined, rs));
    }
    return rs.map((s) => new RefsCodeLens(d.uri, f, s));
  }

  protected abstract extractSymbol(
    d: vsc.TextDocument,
    n: proto.NavigationTree,
    parent: proto.NavigationTree | undefined
  ): vsc.Range | undefined;

  private walk(
    d: vsc.TextDocument,
    n: proto.NavigationTree,
    parent: proto.NavigationTree | undefined,
    rs: vsc.Range[]
  ) {
    if (!n) return;
    const r = this.extractSymbol(d, n, parent);
    if (r) rs.push(r);
    (n.childItems || []).forEach((c) => this.walk(d, c, n, rs));
  }
}

export function symbolRange(
  d: vsc.TextDocument,
  n: proto.NavigationTree
): vsc.Range | undefined {
  if (n.nameSpan) return qc.Range.fromTextSpan(n.nameSpan);
  const s = n.spans && n.spans[0];
  if (!s) return;
  const r = qc.Range.fromTextSpan(s);
  const t = d.getText(r);
  const re = new RegExp(`^(.*?(\\b|\\W))${qu.escapeRegExp(n.text || '')}(\\b|\\W)`, 'gm');
  const m = re.exec(t);
  const l = m ? m.index + m[1].length : 0;
  const o = d.offsetAt(new vsc.Position(r.start.line, r.start.character)) + l;
  return new vsc.Range(d.positionAt(o), d.positionAt(o + n.text.length));
}

class References extends CodeLens {
  constructor(
    protected client: qs.IServiceClient,
    cached: CachedResponse<proto.NavTreeResponse>,
    private mode: string
  ) {
    super(client, cached);
  }

  async resolveCodeLens(
    inp: vsc.CodeLens,
    ct: vsc.CancellationToken
  ): Promise<vsc.CodeLens> {
    const cl = inp as RefsCodeLens;
    const args = qc.Position.toFileLocationRequestArgs(cl.file, cl.range.start);
    const r = await this.client.execute('references', args, ct, {
      slow: true,
      cancelOnResourceChange: cl.doc,
    });
    if (r.type !== 'response' || !r.body) {
      cl.command = r.type === 'cancelled' ? CodeLens.cancelled : CodeLens.error;
      return cl;
    }
    const ls = r.body.refs
      .map((r) => qc.Location.fromTextSpan(this.client.toResource(r.file), r))
      .filter(
        (l) =>
          !(
            l.uri.toString() === cl.doc.toString() &&
            l.range.start.isEqual(cl.range.start)
          )
      );
    cl.command = {
      title: this.label(ls),
      command: ls.length ? 'editor.action.showReferences' : '',
      arguments: [cl.doc, cl.range.start, ls],
    };
    return cl;
  }

  private label(ls: ReadonlyArray<vsc.Location>) {
    return ls.length === 1
      ? localize('oneReferenceLabel', '1 reference')
      : localize('manyReferenceLabel', '{0} references', ls.length);
  }

  protected extractSymbol(
    d: vsc.TextDocument,
    n: proto.NavigationTree,
    parent: proto.NavigationTree | undefined
  ): vsc.Range | undefined {
    if (parent && parent.kind === cproto.Kind.enum) return symbolRange(d, n);
    const onAll = vsc.workspace
      .getConfiguration(this.mode)
      .get<boolean>('referencesCodeLens.showOnAllFunctions');
    switch (n.kind) {
      case cproto.Kind.function:
        if (onAll) return symbolRange(d, n);
      // eslint-disable-next-line no-fallthrough
      case cproto.Kind.const:
      case cproto.Kind.let:
      case cproto.Kind.variable:
        if (/\bexport\b/.test(n.kindModifiers)) return symbolRange(d, n);
        break;
      case cproto.Kind.class:
        if (n.text === '<class>') break;
        return symbolRange(d, n);
      case cproto.Kind.interface:
      case cproto.Kind.type:
      case cproto.Kind.enum:
        return symbolRange(d, n);
      case cproto.Kind.method:
      case cproto.Kind.memberGetAccessor:
      case cproto.Kind.memberSetAccessor:
      case cproto.Kind.constructorImplementation:
      case cproto.Kind.memberVariable:
        if (
          parent &&
          qc.Position.fromLocation(parent.spans[0].start).isEqual(
            qc.Position.fromLocation(n.spans[0].start)
          )
        ) {
          return;
        }
        switch (parent?.kind) {
          case cproto.Kind.class:
          case cproto.Kind.interface:
          case cproto.Kind.type:
            return symbolRange(d, n);
        }
        break;
    }
    return;
  }
}

export function register(
  s: vsc.DocumentSelector,
  mode: string,
  c: qs.IServiceClient,
  r: CachedResponse<proto.NavTreeResponse>
) {
  return new qr.ConfigDependent(mode, 'referencesCodeLens.enabled', () => {
    return vsc.languages.registerCodeLensProvider(s, new References(c, r, mode));
  });
}
