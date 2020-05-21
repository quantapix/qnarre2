import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as proto from '../protocol';
import * as cproto from '../protocol.const';
import * as qc from '../utils/convert';
import { IServiceClient } from '../service';
import { ConfigurationDependentRegistration } from '../utils/registration';
import { BaseCodeLens, RefsCodeLens, getSymbolRange } from './codeLens';
import { CachedResponse } from '../server';

const localize = nls.loadMessageBundle();

class Implementations extends BaseCodeLens {
  public async resolveCodeLens(
    inp: vscode.CodeLens,
    ct: vscode.CancellationToken
  ): Promise<vscode.CodeLens> {
    const cl = inp as RefsCodeLens;
    const args = qc.Position.toFileLocationRequestArgs(cl.file, cl.range.start);
    const r = await this.client.execute('implementation', args, ct, {
      slow: true,
      cancelOnResourceChange: cl.doc,
    });
    if (r.type !== 'response' || !r.body) {
      cl.command = r.type === 'cancelled' ? BaseCodeLens.cancelled : BaseCodeLens.error;
      return cl;
    }
    const ls = r.body
      .map(
        (r) =>
          new vscode.Location(
            this.client.toResource(r.file),
            r.start.line === r.end.line
              ? qc.Range.fromTextSpan(r)
              : new vscode.Range(
                  qc.Position.fromLocation(r.start),
                  new vscode.Position(r.start.line, 0)
                )
          )
      )
      .filter(
        (l) =>
          !(
            l.uri.toString() === cl.doc.toString() &&
            l.range.start.line === cl.range.start.line &&
            l.range.start.character === cl.range.start.character
          )
      );
    cl.command = this.command(ls, cl);
    return cl;
  }

  private command(ls: vscode.Location[], cl: RefsCodeLens): vscode.Command | undefined {
    return {
      title: this.label(ls),
      command: ls.length ? 'editor.action.showReferences' : '',
      arguments: [cl.doc, cl.range.start, ls],
    };
  }

  private label(ls: vscode.Location[]) {
    return ls.length === 1
      ? localize('oneImplementationLabel', '1 implementation')
      : localize('manyImplementationLabel', '{0} implementations', ls.length);
  }

  protected extractSymbol(
    d: vscode.TextDocument,
    n: proto.NavigationTree,
    _parent: proto.NavigationTree | null
  ): vscode.Range | null {
    switch (n.kind) {
      case cproto.Kind.interface:
        return getSymbolRange(d, n);
      case cproto.Kind.class:
      case cproto.Kind.method:
      case cproto.Kind.memberVariable:
      case cproto.Kind.memberGetAccessor:
      case cproto.Kind.memberSetAccessor:
        if (n.kindModifiers.match(/\babstract\b/g)) {
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
    'implementationsCodeLens.enabled',
    () => {
      return vscode.languages.registerCodeLensProvider(s, new Implementations(c, r));
    }
  );
}
