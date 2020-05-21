import * as cproto from '../protocol.const';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import { CachedResponse } from '../server';
import * as qc from '../utils/convert';
import * as qs from '../service';

class DocumentSymbol implements vsc.DocumentSymbolProvider {
  constructor(
    private readonly client: qs.IServiceClient,
    private cached: CachedResponse<proto.NavTreeResponse>
  ) {}

  async provideDocumentSymbols(
    d: vsc.TextDocument,
    ct: vsc.CancellationToken
  ): Promise<vsc.DocumentSymbol[] | undefined> {
    const file = this.client.toOpenedPath(d);
    if (!file) return;
    const args: proto.FileRequestArgs = { file };
    const r = await this.cached.execute(d, () =>
      this.client.execute('navtree', args, ct)
    );
    if (r.type !== 'response' || !r.body?.childItems) return;
    const ss: vsc.DocumentSymbol[] = [];
    for (const i of r.body.childItems) {
      convertTree(d.uri, ss, i);
    }
    return ss;
  }
}

function convertTree(uri: vsc.Uri, ss: vsc.DocumentSymbol[], n: proto.NavigationTree) {
  let should = shouldInclude(n);
  if (!should && !n.childItems?.length) return false;
  const cs = new Set(n.childItems || []);
  for (const s of n.spans) {
    const r = qc.Range.fromTextSpan(s);
    const sel = n.nameSpan ? qc.Range.fromTextSpan(n.nameSpan) : r;
    const sym = new vsc.DocumentSymbol(
      n.text,
      '',
      symbolKind(n.kind),
      r,
      r.contains(sel) ? sel : r
    );
    for (const c of cs) {
      if (c.spans.some((s2) => !!r.intersection(qc.Range.fromTextSpan(s2)))) {
        const did = convertTree(uri, sym.children, c);
        should = should || did;
        cs.delete(c);
      }
    }
    if (should) ss.push(sym);
  }
  return should;
}

function shouldInclude(n: proto.NavigationTree | proto.NavigationBarItem) {
  if (n.kind === cproto.Kind.alias) return false;
  return !!(n.text && n.text !== '<function>' && n.text !== '<class>');
}

const symbolKind = (kind: string): vsc.SymbolKind => {
  switch (kind) {
    case cproto.Kind.module:
      return vsc.SymbolKind.Module;
    case cproto.Kind.class:
      return vsc.SymbolKind.Class;
    case cproto.Kind.enum:
      return vsc.SymbolKind.Enum;
    case cproto.Kind.interface:
      return vsc.SymbolKind.Interface;
    case cproto.Kind.method:
      return vsc.SymbolKind.Method;
    case cproto.Kind.memberVariable:
      return vsc.SymbolKind.Property;
    case cproto.Kind.memberGetAccessor:
      return vsc.SymbolKind.Property;
    case cproto.Kind.memberSetAccessor:
      return vsc.SymbolKind.Property;
    case cproto.Kind.variable:
      return vsc.SymbolKind.Variable;
    case cproto.Kind.const:
      return vsc.SymbolKind.Variable;
    case cproto.Kind.localVariable:
      return vsc.SymbolKind.Variable;
    case cproto.Kind.function:
      return vsc.SymbolKind.Function;
    case cproto.Kind.localFunction:
      return vsc.SymbolKind.Function;
    case cproto.Kind.constructSignature:
      return vsc.SymbolKind.Constructor;
    case cproto.Kind.constructorImplementation:
      return vsc.SymbolKind.Constructor;
  }
  return vsc.SymbolKind.Variable;
};

export function register(
  s: vsc.DocumentSelector,
  c: qs.IServiceClient,
  cached: CachedResponse<proto.NavTreeResponse>
) {
  return vsc.languages.registerDocumentSymbolProvider(s, new DocumentSymbol(c, cached), {
    label: 'TypeScript',
  });
}
