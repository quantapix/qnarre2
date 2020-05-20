import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as proto from '../protocol';
import * as cproto from '../protocol.const';
import * as qc from '../utils/convert';
import { CachedResponse } from '../server';
import { IServiceClient } from '../service';
import { ConfigurationDependentRegistration } from '../utils/dependentRegistration';
import { getSymbolRange, RefsCodeLens, BaseCodeLens } from './codeLens';

const localize = nls.loadMessageBundle();

class References extends BaseCodeLens {
  constructor(
    protected client: IServiceClient,
    cached: CachedResponse<proto.NavTreeResponse>,
    private mode: string
  ) {
    super(client, cached);
  }

  async resolveCodeLens(
    inp: vscode.CodeLens,
    ct: vscode.CancellationToken
  ): Promise<vscode.CodeLens> {
    const cl = inp as RefsCodeLens;
    const args = qc.Position.toFileLocationRequestArgs(cl.file, cl.range.start);
    const r = await this.client.execute('references', args, ct, {
      slow: true,
      cancelOnResourceChange: cl.doc,
    });
    if (r.type !== 'response' || !r.body) {
      cl.command = r.type === 'cancelled' ? BaseCodeLens.cancelled : BaseCodeLens.error;
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

  private label(ls: ReadonlyArray<vscode.Location>) {
    return ls.length === 1
      ? localize('oneReferenceLabel', '1 reference')
      : localize('manyReferenceLabel', '{0} references', ls.length);
  }

  protected extractSymbol(
    d: vscode.TextDocument,
    n: proto.NavigationTree,
    parent: proto.NavigationTree | null
  ): vscode.Range | null {
    if (parent && parent.kind === cproto.Kind.enum) return getSymbolRange(d, n);
    const onAll = vscode.workspace
      .getConfiguration(this.mode)
      .get<boolean>('referencesCodeLens.showOnAllFunctions');
    switch (n.kind) {
      case cproto.Kind.function:
        if (onAll) return getSymbolRange(d, n);
      // eslint-disable-next-line no-fallthrough
      case cproto.Kind.const:
      case cproto.Kind.let:
      case cproto.Kind.variable:
        // Only show references for exported variables
        if (/\bexport\b/.test(n.kindModifiers)) return getSymbolRange(d, n);
        break;
      case cproto.Kind.class:
        if (n.text === '<class>') break;
        return getSymbolRange(d, n);
      case cproto.Kind.interface:
      case cproto.Kind.type:
      case cproto.Kind.enum:
        return getSymbolRange(d, n);
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
          return null;
        }
        switch (parent?.kind) {
          case cproto.Kind.class:
          case cproto.Kind.interface:
          case cproto.Kind.type:
            return getSymbolRange(d, n);
        }
        break;
    }
    return null;
  }
}

export function register(
  s: vscode.DocumentSelector,
  mode: string,
  c: IServiceClient,
  r: CachedResponse<proto.NavTreeResponse>
) {
  return new ConfigurationDependentRegistration(
    mode,
    'referencesCodeLens.enabled',
    () => {
      return vscode.languages.registerCodeLensProvider(s, new References(c, r, mode));
    }
  );
}
