import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qc from '../utils/convert';
import * as qp from '../utils/previewer';
import * as qs from '../service';

class SignatureHelp implements vsc.SignatureHelpProvider {
  static readonly triggerCharacters = ['(', ',', '<'];
  static readonly retriggerCharacters = [')'];

  constructor(private readonly client: qs.IServiceClient) {}

  async provideSignatureHelp(
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken,
    ctx: vsc.SignatureHelpContext
  ): Promise<vsc.SignatureHelp | undefined> {
    const f = this.client.toOpenedPath(d);
    if (!f) return;
    const args: proto.SignatureHelpRequestArgs = {
      ...qc.Position.toFileLocationRequestArgs(f, p),
      triggerReason: toTsTriggerReason(ctx),
    };
    const r = await this.client.interruptGetErr(() =>
      this.client.execute('signatureHelp', args, ct)
    );
    if (r.type !== 'response' || !r.body) return;
    const b = r.body;
    const h = new vsc.SignatureHelp();
    h.signatures = b.items.map((s) => this.convert(s));
    h.activeSignature = this.activeSignature(ctx, b, h.signatures);
    h.activeParameter = this.activeParam(b);
    return h;
  }

  private activeSignature(
    ctx: vsc.SignatureHelpContext,
    h: proto.SignatureHelpItems,
    ss: readonly vsc.SignatureInformation[]
  ) {
    const prev =
      ctx.activeSignatureHelp?.signatures[ctx.activeSignatureHelp.activeSignature];
    if (prev && ctx.isRetrigger) {
      const i = ss.findIndex((o) => o.label === prev?.label);
      if (i >= 0) return i;
    }
    return h.selectedItemIndex;
  }

  private activeParam(h: proto.SignatureHelpItems) {
    const s = h.items[h.selectedItemIndex];
    if (s && s.isVariadic) return Math.min(h.argumentIndex, s.parameters.length - 1);
    return h.argumentIndex;
  }

  private convert(h: proto.SignatureHelpItem) {
    const s = new vsc.SignatureInformation(
      qp.plain(h.prefixDisplayParts),
      qp.mdDocumentation(
        h.documentation,
        h.tags.filter((t) => t.name !== 'param')
      )
    );
    let idx = s.label.length;
    const sep = qp.plain(h.separatorDisplayParts);
    for (let i = 0; i < h.parameters.length; ++i) {
      const p = h.parameters[i];
      const label = qp.plain(p.displayParts);
      s.parameters.push(
        new vsc.ParameterInformation(
          [idx, idx + label.length],
          qp.mdDocumentation(p.documentation, [])
        )
      );
      idx += label.length;
      s.label += label;
      if (i !== h.parameters.length - 1) {
        s.label += sep;
        idx += sep.length;
      }
    }
    s.label += qp.plain(h.suffixDisplayParts);
    return s;
  }
}

function toTsTriggerReason(
  ctx: vsc.SignatureHelpContext
): proto.SignatureHelpTriggerReason {
  switch (ctx.triggerKind) {
    case vsc.SignatureHelpTriggerKind.TriggerCharacter:
      if (ctx.triggerCharacter) {
        if (ctx.isRetrigger) {
          return { kind: 'retrigger', triggerCharacter: ctx.triggerCharacter as any };
        } else {
          return {
            kind: 'characterTyped',
            triggerCharacter: ctx.triggerCharacter as any,
          };
        }
      } else return { kind: 'invoked' };
    case vsc.SignatureHelpTriggerKind.ContentChange:
      return ctx.isRetrigger ? { kind: 'retrigger' } : { kind: 'invoked' };
    case vsc.SignatureHelpTriggerKind.Invoke:
    default:
      return { kind: 'invoked' };
  }
}
export function register(s: vsc.DocumentSelector, c: qs.IServiceClient) {
  return vsc.languages.registerSignatureHelpProvider(s, new SignatureHelp(c), {
    triggerCharacters: SignatureHelp.triggerCharacters,
    retriggerCharacters: SignatureHelp.retriggerCharacters,
  });
}
