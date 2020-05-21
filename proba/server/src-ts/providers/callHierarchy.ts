import * as cproto from '../protocol.const';
import * as path from 'path';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qc from '../utils/convert';
import * as qr from '../utils/registration';
import * as qs from '../service';

class CallHierarchy implements vsc.CallHierarchyProvider {
  static readonly minApi = qr.API.default;

  constructor(private readonly client: qs.IServiceClient) {}

  async prepareCallHierarchy(
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken
  ): Promise<vsc.CallHierarchyItem | vsc.CallHierarchyItem[] | undefined> {
    const f = this.client.toOpenedPath(d);
    if (!f) return;
    const args = qc.Position.toFileLocationRequestArgs(f, p);
    const r = await this.client.execute('prepareCallHierarchy', args, ct);
    if (r.type !== 'response' || !r.body) return;
    return Array.isArray(r.body) ? r.body.map(fromProtocol) : fromProtocol(r.body);
  }

  async provideCallHierarchyIncomingCalls(
    i: vsc.CallHierarchyItem,
    ct: vsc.CancellationToken
  ): Promise<vsc.CallHierarchyIncomingCall[] | undefined> {
    const f = this.client.toPath(i.uri);
    if (!f) return;
    const args = qc.Position.toFileLocationRequestArgs(f, i.selectionRange.start);
    const r = await this.client.execute('provideCallHierarchyIncomingCalls', args, ct);
    if (r.type !== 'response' || !r.body) return;
    return r.body.map(fromIncoming);
  }

  async provideCallHierarchyOutgoingCalls(
    i: vsc.CallHierarchyItem,
    ct: vsc.CancellationToken
  ): Promise<vsc.CallHierarchyOutgoingCall[] | undefined> {
    const f = this.client.toPath(i.uri);
    if (!f) return;
    const args = qc.Position.toFileLocationRequestArgs(f, i.selectionRange.start);
    const r = await this.client.execute('provideCallHierarchyOutgoingCalls', args, ct);
    if (r.type !== 'response' || !r.body) return;
    return r.body.map(fromOutgoing);
  }
}

function isSource(i: proto.CallHierarchyItem) {
  return (
    i.kind === cproto.Kind.script ||
    (i.kind === cproto.Kind.module &&
      i.selectionSpan.start.line === 1 &&
      i.selectionSpan.start.offset === 1)
  );
}

function fromProtocol(i: proto.CallHierarchyItem) {
  const src = isSource(i);
  const n = src ? path.basename(i.file) : i.name;
  const detail = src ? vsc.workspace.asRelativePath(path.dirname(i.file)) : '';
  return new vsc.CallHierarchyItem(
    qc.SymbolKind.fromScriptElem(i.kind),
    name,
    detail,
    vsc.Uri.file(i.file),
    qc.Range.fromTextSpan(i.span),
    qc.Range.fromTextSpan(i.selectionSpan)
  );
}

function fromIncoming(c: proto.CallHierarchyIncomingCall) {
  return new vsc.CallHierarchyIncomingCall(
    fromProtocol(c.from),
    c.fromSpans.map(qc.Range.fromTextSpan)
  );
}

function fromOutgoing(c: proto.CallHierarchyOutgoingCall) {
  return new vsc.CallHierarchyOutgoingCall(
    fromProtocol(c.to),
    c.fromSpans.map(qc.Range.fromTextSpan)
  );
}

export function register(s: vsc.DocumentSelector, c: qs.IServiceClient) {
  return new qr.VersionDependent(c, CallHierarchy.minApi, () =>
    vsc.languages.registerCallHierarchyProvider(s, new CallHierarchy(c))
  );
}
