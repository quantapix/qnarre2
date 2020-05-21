import * as vscode from 'vscode';
import { IServiceClient } from '../service';
import * as qc from '../utils/convert';
import { API } from '../utils/api';
import { VersionDependentRegistration } from '../utils/dependentRegistration';
import type * as proto from '../protocol';
import * as path from 'path';
import * as cproto from '../protocol.const';

class CallHierarchy implements vscode.CallHierarchyProvider {
  static readonly minVersion = API.v380;

  constructor(private readonly client: IServiceClient) {}

  async prepareCallHierarchy(
    d: vscode.TextDocument,
    p: vscode.Position,
    ct: vscode.CancellationToken
  ): Promise<vscode.CallHierarchyItem | vscode.CallHierarchyItem[] | undefined> {
    const f = this.client.toOpenedPath(d);
    if (!f) return;
    const args = qc.Position.toFileLocationRequestArgs(f, p);
    const r = await this.client.execute('prepareCallHierarchy', args, ct);
    if (r.type !== 'response' || !r.body) return;
    return Array.isArray(r.body) ? r.body.map(fromProtocol) : fromProtocol(r.body);
  }

  async provideCallHierarchyIncomingCalls(
    i: vscode.CallHierarchyItem,
    ct: vscode.CancellationToken
  ): Promise<vscode.CallHierarchyIncomingCall[] | undefined> {
    const f = this.client.toPath(i.uri);
    if (!f) return;
    const args = qc.Position.toFileLocationRequestArgs(f, i.selectionRange.start);
    const r = await this.client.execute('provideCallHierarchyIncomingCalls', args, ct);
    if (r.type !== 'response' || !r.body) return;
    return r.body.map(fromIncomingCall);
  }

  async provideCallHierarchyOutgoingCalls(
    i: vscode.CallHierarchyItem,
    ct: vscode.CancellationToken
  ): Promise<vscode.CallHierarchyOutgoingCall[] | undefined> {
    const f = this.client.toPath(i.uri);
    if (!f) return;
    const args = qc.Position.toFileLocationRequestArgs(f, i.selectionRange.start);
    const r = await this.client.execute('provideCallHierarchyOutgoingCalls', args, ct);
    if (r.type !== 'response' || !r.body) return;
    return r.body.map(fromOutgoingCall);
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
  const detail = src ? vscode.workspace.asRelativePath(path.dirname(i.file)) : '';
  return new vscode.CallHierarchyItem(
    qc.SymbolKind.fromScriptElem(i.kind),
    name,
    detail,
    vscode.Uri.file(i.file),
    qc.Range.fromTextSpan(i.span),
    qc.Range.fromTextSpan(i.selectionSpan)
  );
}

function fromIncomingCall(c: proto.CallHierarchyIncomingCall) {
  return new vscode.CallHierarchyIncomingCall(
    fromProtocol(c.from),
    c.fromSpans.map(qc.Range.fromTextSpan)
  );
}

function fromOutgoingCall(c: proto.CallHierarchyOutgoingCall) {
  return new vscode.CallHierarchyOutgoingCall(
    fromProtocol(c.to),
    c.fromSpans.map(qc.Range.fromTextSpan)
  );
}

export function register(s: vscode.DocumentSelector, c: IServiceClient) {
  return new VersionDependentRegistration(c, CallHierarchy.minVersion, () =>
    vscode.languages.registerCallHierarchyProvider(s, new CallHierarchy(c))
  );
}
