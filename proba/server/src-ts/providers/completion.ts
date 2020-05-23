import * as cproto from '../protocol.const';
import * as nls from 'vscode-nls';
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import { applyCodeAction } from '../utils/codeAction';
import { FileConfigs } from '../utils/configs';
import { snippetForFunctionCall } from '../utils/snippetForFunctionCall';
import { TelemetryReporter } from '../utils/telemetry';
import { TypingsStatus } from '../utils/typingsStatus';
import * as md from '../utils/preview';
import * as qc from '../utils/convert';
import * as qr from '../utils/registration';
import * as qs from '../service';
import * as qx from '../utils/extras';

const localize = nls.loadMessageBundle();

interface DotAccessor {
  readonly range: vsc.Range;
  readonly text: string;
}

interface Context {
  readonly isNewIdentifier: boolean;
  readonly isMember: boolean;
  readonly dot?: DotAccessor;
  readonly callCompletions: boolean;
  readonly snippets: boolean;
  readonly wordRange: vsc.Range | undefined;
  readonly line: string;
}

class CompletionItem extends vsc.CompletionItem {
  readonly useSnippet: boolean;

  constructor(
    public readonly pos: vsc.Position,
    public readonly doc: vsc.TextDocument,
    public readonly entry: proto.CompletionEntry,
    private readonly ctx: Context,
    public readonly meta?: any
  ) {
    super(entry.name, CompletionItem.convertKind(entry.kind));
    if (entry.source) this.sortText = '\uffff' + entry.sortText;
    else this.sortText = entry.sortText;
    this.preselect = entry.isRecommended;
    this.useSnippet =
      ctx.snippets &&
      (this.kind === vsc.CompletionItemKind.Function ||
        this.kind === vsc.CompletionItemKind.Method);
    this.range = this.rangeFrom(entry, ctx, pos);
    this.commitCharacters = CompletionItem.commitCharacters(ctx, entry);
    this.insertText = entry.insertText;
    this.filterText = this.filterFrom(ctx.line, entry.insertText);
    if (ctx.isMember && ctx.dot) {
      this.filterText = ctx.dot.text + (this.insertText || this.label);
      if (!this.range) {
        const replacementRange = this.ctx.wordRange;
        if (replacementRange) {
          this.range = {
            inserting: ctx.dot.range,
            replacing: ctx.dot.range.union(replacementRange),
          };
        } else this.range = ctx.dot.range;
        this.insertText = this.filterText;
      }
    }
    if (entry.kindModifiers) {
      const ms = entry.kindModifiers.split(/,|\s+/g);
      if (ms.includes(cproto.KindModifiers.optional)) {
        if (!this.insertText) this.insertText = this.label;
        if (!this.filterText) this.filterText = this.label;
        this.label += '?';
      }
      if (ms.includes(cproto.KindModifiers.color)) {
        this.kind = vsc.CompletionItemKind.Color;
      }
      if (entry.kind === cproto.Kind.script) {
        for (const m of cproto.KindModifiers.fileExtensionKindModifiers) {
          if (ms.includes(m)) {
            if (entry.name.toLowerCase().endsWith(m)) this.detail = entry.name;
            else this.detail = entry.name + m;
            break;
          }
        }
      }
    }
    this.resolveRange();
  }

  private rangeFrom(e: proto.CompletionEntry, c: Context, p: vsc.Position) {
    if (!e.replacementSpan) return;
    let r = qc.Range.fromTextSpan(e.replacementSpan);
    if (!r.isSingleLine) {
      r = new vsc.Range(r.start.line, r.start.character, r.start.line, c.line.length);
    }
    return { inserting: new vsc.Range(r.start, p), replacing: r };
  }

  private filterFrom(line: string, t: string | undefined): string | undefined {
    if (this.entry.name.startsWith('#')) {
      const r = this.ctx.wordRange;
      const s = r ? line.charAt(r.start.character) : undefined;
      if (t) {
        if (t.startsWith('this.#')) return s === '#' ? t : t.replace(/^this\.#/, '');
        else return t;
      } else return s === '#' ? undefined : this.entry.name.replace(/^#/, '');
    }
    if (t?.startsWith('this.')) return;
    else if (t?.startsWith('[')) return t.replace(/^\[['"](.+)[['"]\]$/, '.$1');
    return t;
  }

  private resolveRange() {
    if (this.range) return;
    const r = this.ctx.wordRange;
    if (r) {
      this.range = {
        inserting: new vsc.Range(r.start, this.pos),
        replacing: r,
      };
    }
  }

  private static convertKind(k: string): vsc.CompletionItemKind {
    switch (k) {
      case cproto.Kind.primitiveType:
      case cproto.Kind.keyword:
        return vsc.CompletionItemKind.Keyword;
      case cproto.Kind.const:
      case cproto.Kind.let:
      case cproto.Kind.variable:
      case cproto.Kind.localVariable:
      case cproto.Kind.alias:
      case cproto.Kind.parameter:
        return vsc.CompletionItemKind.Variable;
      case cproto.Kind.memberVariable:
      case cproto.Kind.memberGetAccessor:
      case cproto.Kind.memberSetAccessor:
        return vsc.CompletionItemKind.Field;
      case cproto.Kind.function:
      case cproto.Kind.localFunction:
        return vsc.CompletionItemKind.Function;
      case cproto.Kind.method:
      case cproto.Kind.constructSignature:
      case cproto.Kind.callSignature:
      case cproto.Kind.indexSignature:
        return vsc.CompletionItemKind.Method;
      case cproto.Kind.enum:
        return vsc.CompletionItemKind.Enum;
      case cproto.Kind.enumMember:
        return vsc.CompletionItemKind.EnumMember;
      case cproto.Kind.module:
      case cproto.Kind.externalModuleName:
        return vsc.CompletionItemKind.Module;
      case cproto.Kind.class:
      case cproto.Kind.type:
        return vsc.CompletionItemKind.Class;
      case cproto.Kind.interface:
        return vsc.CompletionItemKind.Interface;
      case cproto.Kind.warning:
        return vsc.CompletionItemKind.Text;
      case cproto.Kind.script:
        return vsc.CompletionItemKind.File;
      case cproto.Kind.directory:
        return vsc.CompletionItemKind.Folder;
      case cproto.Kind.string:
        return vsc.CompletionItemKind.Constant;
      default:
        return vsc.CompletionItemKind.Property;
    }
  }

  private static commitCharacters(
    c: Context,
    e: proto.CompletionEntry
  ): string[] | undefined {
    if (c.isNewIdentifier) return;
    const cs: string[] = [];
    switch (e.kind) {
      case cproto.Kind.memberGetAccessor:
      case cproto.Kind.memberSetAccessor:
      case cproto.Kind.constructSignature:
      case cproto.Kind.callSignature:
      case cproto.Kind.indexSignature:
      case cproto.Kind.enum:
      case cproto.Kind.interface:
        cs.push('.', ';');
        break;
      case cproto.Kind.module:
      case cproto.Kind.alias:
      case cproto.Kind.const:
      case cproto.Kind.let:
      case cproto.Kind.variable:
      case cproto.Kind.localVariable:
      case cproto.Kind.memberVariable:
      case cproto.Kind.class:
      case cproto.Kind.function:
      case cproto.Kind.method:
      case cproto.Kind.keyword:
      case cproto.Kind.parameter:
        cs.push('.', ',', ';');
        if (c.callCompletions) cs.push('(');
        break;
    }
    return cs.length === 0 ? undefined : cs;
  }
}

class Composite implements qx.Command {
  static readonly ID = '_typescript.composite';
  readonly id = Composite.ID;
  execute(...cs: vsc.Command[]) {
    for (const c of cs) {
      vsc.commands.executeCommand(c.command, ...(c.arguments || []));
    }
  }
}

class Accepted implements qx.Command {
  static readonly ID = '_typescript.onCompletionAccepted';
  readonly id = Accepted.ID;
  constructor(private readonly onCompletionAccepted: (_: vsc.CompletionItem) => void) {}
  execute(i: vsc.CompletionItem) {
    this.onCompletionAccepted(i);
  }
}

class Apply implements qx.Command {
  static readonly ID = '_typescript.applyCompletionCodeAction';
  readonly id = Apply.ID;

  constructor(private readonly client: qs.IServiceClient) {}

  async execute(_: string, cs: proto.CodeAction[]): Promise<boolean> {
    if (cs.length === 0) return true;
    if (cs.length === 1) return applyCodeAction(this.client, cs[0], qx.nulToken);
    interface QuickPick extends vsc.QuickPickItem {
      index: number;
    }
    const s = await vsc.window.showQuickPick<QuickPick>(
      cs.map((a, i): QuickPick => ({ label: a.description, description: '', index: i })),
      { placeHolder: localize('selectCodeAction', 'Select code action to apply') }
    );
    if (!s) return false;
    const a = cs[s.index];
    if (!a) return false;
    return applyCodeAction(this.client, a, qx.nulToken);
  }
}

interface Config {
  readonly autoImports: boolean;
  readonly names: boolean;
  readonly paths: boolean;
  readonly snippets: boolean;
}

namespace Config {
  export const autoImports = 'suggest.autoImports';
  export const names = 'suggest.names';
  export const paths = 'suggest.paths';
  export const snippets = 'suggest.completeFunctionCalls';

  export function configFor(lang: string, r: vsc.Uri): Config {
    const c = vsc.workspace.getConfiguration(lang, r);
    return {
      autoImports: c.get<boolean>(Config.autoImports, true),
      names: c.get<boolean>(Config.names, true),
      paths: c.get<boolean>(Config.paths, true),
      snippets: c.get<boolean>(Config.snippets, false),
    };
  }
}

class Completion implements vsc.CompletionItemProvider {
  static readonly triggers = ['.', '"', "'", '`', '/', '@', '<', '#'];

  constructor(
    private readonly client: qs.IServiceClient,
    private readonly lang: string,
    private readonly typs: TypingsStatus,
    private readonly fileConfigurationManager: FileConfigs,
    cmds: qx.Commands,
    private readonly tele: TelemetryReporter,
    onCompletionAccepted: (_: vsc.CompletionItem) => void
  ) {
    cmds.register(new Apply(this.client));
    cmds.register(new Composite());
    cmds.register(new Accepted(onCompletionAccepted));
  }

  async provideCompletionItems(
    d: vsc.TextDocument,
    p: vsc.Position,
    ct: vsc.CancellationToken,
    ctx: vsc.CompletionContext
  ): Promise<vsc.CompletionList | null> {
    if (this.typs.isAcquiring) {
      return Promise.reject<vsc.CompletionList>({
        label: localize(
          { key: 'acquiringTypingsLabel', comment: ['Typings should not be localized'] },
          'Acquiring typings...'
        ),
        detail: localize(
          { key: 'acquiringTypingsDetail', comment: ['Typings should not be localized'] },
          'Acquiring typings definitions for IntelliSense.'
        ),
      });
    }
    const file = this.client.toOpenedPath(d);
    if (!file) return null;
    const line = d.lineAt(p.line);
    const cfg = Config.configFor(this.lang, d.uri);
    await this.client.interruptGetErr(() =>
      this.fileConfigurationManager.ensureConfigurationForDocument(d, ct)
    );
    const args: proto.CompletionsRequestArgs = {
      ...qc.Position.toFileLocationRequestArgs(file, p),
      includeExternalModuleExports: cfg.autoImports,
      includeInsertTextCompletions: true,
      triggerCharacter: this.triggerCharacter(ctx),
    };
    const time = Date.now();
    let r: qs.ServerResponse.Response<proto.CompletionInfoResponse> | undefined;
    try {
      r = await this.client.interruptGetErr(() =>
        this.client.execute('completionInfo', args, ct)
      );
    } finally {
      const duration = Date.now() - time;
      this.tele.logTelemetry('completions.execute', {
        duration,
        type: r?.type ?? 'unknown',
        count: r?.type === 'response' && r.body ? r.body.entries.length : 0,
        updateGraphDurationMs:
          r?.type === 'response' ? r.performanceData?.updateGraphDurationMs : undefined,
      });
    }
    if (r.type !== 'response' || !r.body) return null;
    let dot: DotAccessor | undefined;
    const isMember = r.body.isMemberCompletion;
    if (isMember) {
      const m = /\??\.\s*$/.exec(line.text.slice(0, p.character)) || undefined;
      if (m) {
        const range = new vsc.Range(p.translate({ characterDelta: -m[0].length }), p);
        const text = d.getText(range);
        dot = { range, text };
      }
    }
    const c = {
      isNewIdentifier: r.body.isNewIdentifierLocation,
      isMember,
      dot,
      callCompletions: !cfg.snippets,
      wordRange: d.getWordRangeAtPosition(p),
      line: line.text,
      snippets: cfg.snippets,
    };
    const meta = (r as any).meta;
    const items: CompletionItem[] = [];
    for (const e of r.body.entries) {
      if (!shouldExclude(e, cfg)) items.push(new CompletionItem(p, d, e, c, meta));
    }
    return new vsc.CompletionList(items, meta.isIncomplete);
  }

  private triggerCharacter(
    c: vsc.CompletionContext
  ): proto.CompletionsTriggerCharacter | undefined {
    switch (c.triggerCharacter) {
      case '@':
      case '#':
      case '.':
      case '"':
      case "'":
      case '`':
      case '/':
      case '<':
        return c.triggerCharacter;
    }
    return;
  }

  async resolveCompletionItem(
    item: CompletionItem,
    ct: vsc.CancellationToken
  ): Promise<CompletionItem | undefined> {
    const file = this.client.toOpenedPath(item.doc);
    if (!file) return;
    const args: proto.CompletionDetailsRequestArgs = {
      ...qc.Position.toFileLocationRequestArgs(file, item.pos),
      entryNames: [
        item.entry.source
          ? { name: item.entry.name, source: item.entry.source }
          : item.entry.name,
      ],
    };
    const r = await this.client.interruptGetErr(() =>
      this.client.execute('completionEntryDetails', args, ct)
    );
    if (r.type !== 'response' || !r.body || !r.body.length) return item;
    const b = r.body[0];
    if (!item.detail && b.displayParts.length) item.detail = md.plain(b.displayParts);
    item.documentation = this.documentation(b, item);
    const cs: vsc.Command[] = [
      {
        command: Accepted.ID,
        title: '',
        arguments: [item],
      },
    ];
    const a = this.codeActions(b, file);
    if (a.cmd) cs.push(a.cmd);
    item.additionalTextEdits = a.edits;
    if (item.useSnippet) {
      const f = await this.functionCompletion(file, item.pos, item.doc, ct);
      if (f) {
        const { snippet, parameterCount } = snippetForFunctionCall(item, b.displayParts);
        item.insertText = snippet;
        if (parameterCount > 0) {
          cs.push({
            title: 'triggerParameterHints',
            command: 'editor.action.triggerParameterHints',
          });
        }
      }
    }
    if (cs.length) {
      if (cs.length === 1) item.command = cs[0];
      else item.command = { command: Composite.ID, title: '', arguments: cs };
    }
    return item;
  }

  private codeActions(
    d: proto.CompletionEntryDetails,
    f: string
  ): { cmd?: vsc.Command; edits?: vsc.TextEdit[] } {
    if (!d.codeActions || !d.codeActions.length) return {};
    const es: vsc.TextEdit[] = [];
    let more = false;
    for (const a of d.codeActions) {
      if (a.commands) more = true;
      if (a.changes) {
        for (const c of a.changes) {
          if (c.fileName === f) es.push(...c.textChanges.map(qc.TextEdit.fromCodeEdit));
          else more = true;
        }
      }
    }
    let cmd: vsc.Command | undefined;
    if (more) {
      cmd = {
        title: '',
        command: Apply.ID,
        arguments: [
          f,
          d.codeActions.map(
            (x): proto.CodeAction => ({
              commands: x.commands,
              description: x.description,
              changes: x.changes.filter((x) => x.fileName !== f),
            })
          ),
        ],
      };
    }
    return { cmd, edits: es.length ? es : undefined };
  }

  private documentation(
    d: proto.CompletionEntryDetails,
    i: CompletionItem
  ): vsc.MarkdownString | undefined {
    const m = new vsc.MarkdownString();
    if (d.source) {
      const p = `'${md.plain(d.source)}'`;
      const l = localize('autoImportLabel', 'Auto import from {0}', p);
      i.detail = `${l}\n${i.detail!}`;
    }
    md.addDocumentation(m, d.documentation, d.tags);
    return m.value.length ? m : undefined;
  }

  private async functionCompletion(
    f: string,
    p: vsc.Position,
    d: vsc.TextDocument,
    ct: vsc.CancellationToken
  ): Promise<boolean> {
    try {
      const args: proto.FileLocationRequestArgs = qc.Position.toFileLocationRequestArgs(
        f,
        p
      );
      const r = await this.client.execute('quickinfo', args, ct);
      if (r.type === 'response' && r.body) {
        switch (r.body.kind) {
          case 'var':
          case 'let':
          case 'const':
          case 'alias':
            return false;
        }
      }
    } catch {}
    const after = d.lineAt(p.line).text.slice(p.character);
    return after.match(/^[a-z_$0-9]*\s*\(/gi) === null;
  }
}

function shouldExclude(e: proto.CompletionEntry, c: Config) {
  return (
    (!c.names && e.kind === cproto.Kind.warning) ||
    (!c.paths &&
      (e.kind === cproto.Kind.directory ||
        e.kind === cproto.Kind.script ||
        e.kind === cproto.Kind.externalModuleName)) ||
    (!c.autoImports && e.hasAction)
  );
}

export function register(
  s: vsc.DocumentSelector,
  lang: string,
  c: qs.IServiceClient,
  typs: TypingsStatus,
  cfgs: FileConfigs,
  cmds: qx.Commands,
  tele: TelemetryReporter,
  onCompletionAccepted: (_: vsc.CompletionItem) => void
) {
  return new qr.ConfigDependent(lang, 'suggest.enabled', () =>
    vsc.languages.registerCompletionItemProvider(
      s,
      new Completion(c, lang, typs, cfgs, cmds, tele, onCompletionAccepted),
      ...Completion.triggers
    )
  );
}
