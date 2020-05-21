import * as cproto from '../protocol.const';
import * as nls from 'vscode-nls';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qc from '../utils/convert';
import * as qs from '../service';
import * as qr from '../utils/registration';
import { CodeLens, RefsCodeLens, symbolRange } from './codeLens';
import { CachedResponse } from '../server';

const localize = nls.loadMessageBundle();

class Implements extends CodeLens {
  public async resolveCodeLens(
    inp: vsc.CodeLens,
    ct: vsc.CancellationToken
  ): Promise<vsc.CodeLens> {
    const cl = inp as RefsCodeLens;
    const args = qc.Position.toFileLocationRequestArgs(cl.file, cl.range.start);
    const r = await this.client.execute('implementation', args, ct, {
      slow: true,
      cancelOnResourceChange: cl.doc,
    });
    if (r.type !== 'response' || !r.body) {
      cl.command = r.type === 'cancelled' ? CodeLens.cancelled : CodeLens.error;
      return cl;
    }
    const ls = r.body
      .map(
        (r) =>
          new vsc.Location(
            this.client.toResource(r.file),
            r.start.line === r.end.line
              ? qc.Range.fromTextSpan(r)
              : new vsc.Range(
                  qc.Position.fromLocation(r.start),
                  new vsc.Position(r.start.line, 0)
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

  private command(ls: vsc.Location[], cl: RefsCodeLens): vsc.Command | undefined {
    return {
      title: this.label(ls),
      command: ls.length ? 'editor.action.showReferences' : '',
      arguments: [cl.doc, cl.range.start, ls],
    };
  }

  private label(ls: vsc.Location[]) {
    return ls.length === 1
      ? localize('oneImplementationLabel', '1 implementation')
      : localize('manyImplementationLabel', '{0} implementations', ls.length);
  }

  protected extractSymbol(
    d: vsc.TextDocument,
    n: proto.NavigationTree,
    _parent: proto.NavigationTree | undefined
  ): vsc.Range | undefined {
    switch (n.kind) {
      case cproto.Kind.interface:
        return symbolRange(d, n);
      case cproto.Kind.class:
      case cproto.Kind.method:
      case cproto.Kind.memberVariable:
      case cproto.Kind.memberGetAccessor:
      case cproto.Kind.memberSetAccessor:
        if (n.kindModifiers.match(/\babstract\b/g)) {
          return symbolRange(d, n);
        }
        break;
    }
    return;
  }
}

export function register(
  s: vsc.DocumentSelector,
  lang: string,
  c: qs.IServiceClient,
  r: CachedResponse<proto.NavTreeResponse>
) {
  return new qr.ConfigDependent(lang, 'implementationsCodeLens.enabled', () => {
    return vsc.languages.registerCodeLensProvider(s, new Implements(c, r));
  });
}
