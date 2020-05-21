/* eslint-disable @typescript-eslint/prefer-regexp-exec */
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as proto from '../protocol';
import * as cproto from '../protocol.const';
import { IServiceClient, ServerResponse } from '../service';
import API from '../utils/api';
import { nulToken } from '../utils/extras';
import { applyCodeAction } from '../utils/codeAction';
import { Command, Commands } from '../utils/extras';
import { ConfigDependent } from '../utils/registration';
import * as Previewer from '../utils/previewer';
import { snippetForFunctionCall } from '../utils/snippetForFunctionCall';
import { TelemetryReporter } from '../utils/telemetry';
import * as typeConverters from '../utils/convert';
import { TypingsStatus } from '../utils/typingsStatus';
import { FileConfigs } from './configs';

const localize = nls.loadMessageBundle();

interface DotAccessorContext {
  readonly range: vscode.Range;
  readonly text: string;
}

interface CompletionContext {
  readonly isNewIdentifierLocation: boolean;
  readonly isMemberCompletion: boolean;
  readonly isInValidCommitCharacterContext: boolean;

  readonly dotAccessorContext?: DotAccessorContext;

  readonly enableCallCompletions: boolean;
  readonly useCodeSnippetsOnMethodSuggest: boolean;

  readonly wordRange: vscode.Range | undefined;
  readonly line: string;

  readonly useFuzzyWordRangeLogic: boolean;
}

class MyCompletionItem extends vscode.CompletionItem {
  readonly useCodeSnippet: boolean;

  constructor(
    public readonly position: vscode.Position,
    public readonly document: vscode.TextDocument,
    public readonly tsEntry: proto.CompletionEntry,
    private readonly completionContext: CompletionContext,
    public readonly metadata: any | undefined
  ) {
    super(tsEntry.name, MyCompletionItem.convertKind(tsEntry.kind));

    if (tsEntry.source) {
      this.sortText = '\uffff' + tsEntry.sortText;
    } else {
      this.sortText = tsEntry.sortText;
    }
    this.preselect = tsEntry.isRecommended;
    this.position = position;
    this.useCodeSnippet =
      completionContext.useCodeSnippetsOnMethodSuggest &&
      (this.kind === vscode.CompletionItemKind.Function ||
        this.kind === vscode.CompletionItemKind.Method);

    this.range = this.getRangeFromReplacementSpan(tsEntry, completionContext, position);
    this.commitCharacters = MyCompletionItem.getCommitCharacters(
      completionContext,
      tsEntry
    );
    this.insertText = tsEntry.insertText;
    this.filterText = this.getFilterText(completionContext.line, tsEntry.insertText);

    if (completionContext.isMemberCompletion && completionContext.dotAccessorContext) {
      this.filterText =
        completionContext.dotAccessorContext.text + (this.insertText || this.label);
      if (!this.range) {
        const replacementRange = this.getFuzzyWordRange();
        if (replacementRange) {
          this.range = {
            inserting: completionContext.dotAccessorContext.range,
            replacing: completionContext.dotAccessorContext.range.union(replacementRange),
          };
        } else {
          this.range = completionContext.dotAccessorContext.range;
        }
        this.insertText = this.filterText;
      }
    }

    if (tsEntry.kindModifiers) {
      const kindModifiers = tsEntry.kindModifiers.split(/,|\s+/g);
      if (kindModifiers.includes(cproto.KindModifiers.optional)) {
        if (!this.insertText) this.insertText = this.label;

        if (!this.filterText) this.filterText = this.label;

        this.label += '?';
      }

      if (kindModifiers.includes(cproto.KindModifiers.color)) {
        this.kind = vscode.CompletionItemKind.Color;
      }

      if (tsEntry.kind === cproto.Kind.script) {
        for (const extModifier of cproto.KindModifiers.fileExtensionKindModifiers) {
          if (kindModifiers.includes(extModifier)) {
            if (tsEntry.name.toLowerCase().endsWith(extModifier)) {
              this.detail = tsEntry.name;
            } else {
              this.detail = tsEntry.name + extModifier;
            }
            break;
          }
        }
      }
    }

    this.resolveRange();
  }

  private getRangeFromReplacementSpan(
    tsEntry: proto.CompletionEntry,
    completionContext: CompletionContext,
    position: vscode.Position
  ) {
    if (!tsEntry.replacementSpan) return;

    let replaceRange = typeConverters.Range.fromTextSpan(tsEntry.replacementSpan);
    if (!replaceRange.isSingleLine) {
      replaceRange = new vscode.Range(
        replaceRange.start.line,
        replaceRange.start.character,
        replaceRange.start.line,
        completionContext.line.length
      );
    }
    return {
      inserting: new vscode.Range(replaceRange.start, position),
      replacing: replaceRange,
    };
  }

  private getFilterText(
    line: string,
    insertText: string | undefined
  ): string | undefined {
    if (this.tsEntry.name.startsWith('#')) {
      const wordRange = this.completionContext.wordRange;
      const wordStart = wordRange ? line.charAt(wordRange.start.character) : undefined;
      if (insertText) {
        if (insertText.startsWith('this.#')) {
          return wordStart === '#' ? insertText : insertText.replace(/^this\.#/, '');
        } else {
          return insertText;
        }
      } else {
        return wordStart === '#' ? undefined : this.tsEntry.name.replace(/^#/, '');
      }
    }
    if (insertText?.startsWith('this.')) return;
    // Handle the case:
    // ```
    // const xyz = { 'ab c': 1 };
    // xyz.ab|
    // ```
    // In which case we want to insert a bracket accessor but should use `.abc` as the filter text instead of
    // the bracketed insert text.
    else if (insertText?.startsWith('[')) {
      return insertText.replace(/^\[['"](.+)[['"]\]$/, '.$1');
    }
    return insertText;
  }

  private resolveRange() {
    if (this.range) return;

    const replaceRange = this.getFuzzyWordRange();
    if (replaceRange) {
      this.range = {
        inserting: new vscode.Range(replaceRange.start, this.position),
        replacing: replaceRange,
      };
    }
  }

  private getFuzzyWordRange() {
    if (this.completionContext.useFuzzyWordRangeLogic) {
      const text = this.completionContext.line
        .slice(
          Math.max(0, this.position.character - this.label.length),
          this.position.character
        )
        .toLowerCase();
      const entryName = this.label.toLowerCase();
      for (let i = entryName.length; i >= 0; --i) {
        if (
          text.endsWith(entryName.substr(0, i)) &&
          (!this.completionContext.wordRange ||
            this.completionContext.wordRange.start.character >
              this.position.character - i)
        ) {
          return new vscode.Range(
            new vscode.Position(
              this.position.line,
              Math.max(0, this.position.character - i)
            ),
            this.position
          );
        }
      }
    }
    return this.completionContext.wordRange;
  }

  private static convertKind(kind: string): vscode.CompletionItemKind {
    switch (kind) {
      case cproto.Kind.primitiveType:
      case cproto.Kind.keyword:
        return vscode.CompletionItemKind.Keyword;
      case cproto.Kind.const:
      case cproto.Kind.let:
      case cproto.Kind.variable:
      case cproto.Kind.localVariable:
      case cproto.Kind.alias:
      case cproto.Kind.parameter:
        return vscode.CompletionItemKind.Variable;
      case cproto.Kind.memberVariable:
      case cproto.Kind.memberGetAccessor:
      case cproto.Kind.memberSetAccessor:
        return vscode.CompletionItemKind.Field;
      case cproto.Kind.function:
      case cproto.Kind.localFunction:
        return vscode.CompletionItemKind.Function;
      case cproto.Kind.method:
      case cproto.Kind.constructSignature:
      case cproto.Kind.callSignature:
      case cproto.Kind.indexSignature:
        return vscode.CompletionItemKind.Method;
      case cproto.Kind.enum:
        return vscode.CompletionItemKind.Enum;
      case cproto.Kind.enumMember:
        return vscode.CompletionItemKind.EnumMember;
      case cproto.Kind.module:
      case cproto.Kind.externalModuleName:
        return vscode.CompletionItemKind.Module;
      case cproto.Kind.class:
      case cproto.Kind.type:
        return vscode.CompletionItemKind.Class;
      case cproto.Kind.interface:
        return vscode.CompletionItemKind.Interface;
      case cproto.Kind.warning:
        return vscode.CompletionItemKind.Text;
      case cproto.Kind.script:
        return vscode.CompletionItemKind.File;
      case cproto.Kind.directory:
        return vscode.CompletionItemKind.Folder;
      case cproto.Kind.string:
        return vscode.CompletionItemKind.Constant;
      default:
        return vscode.CompletionItemKind.Property;
    }
  }

  private static getCommitCharacters(
    context: CompletionContext,
    entry: proto.CompletionEntry
  ): string[] | undefined {
    if (context.isNewIdentifierLocation || !context.isInValidCommitCharacterContext) {
      return;
    }

    const commitCharacters: string[] = [];
    switch (entry.kind) {
      case cproto.Kind.memberGetAccessor:
      case cproto.Kind.memberSetAccessor:
      case cproto.Kind.constructSignature:
      case cproto.Kind.callSignature:
      case cproto.Kind.indexSignature:
      case cproto.Kind.enum:
      case cproto.Kind.interface:
        commitCharacters.push('.', ';');
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
        commitCharacters.push('.', ',', ';');
        if (context.enableCallCompletions) {
          commitCharacters.push('(');
        }
        break;
    }
    return commitCharacters.length === 0 ? undefined : commitCharacters;
  }
}

class CompositeCommand implements Command {
  static readonly ID = '_typescript.composite';
  readonly id = CompositeCommand.ID;
  execute(...commands: vscode.Command[]) {
    for (const command of commands) {
      vscode.commands.executeCommand(command.command, ...(command.arguments || []));
    }
  }
}

class CompletionAcceptedCommand implements Command {
  static readonly ID = '_typescript.onCompletionAccepted';
  readonly id = CompletionAcceptedCommand.ID;
  constructor(
    private readonly onCompletionAccepted: (item: vscode.CompletionItem) => void
  ) {}
  execute(i: vscode.CompletionItem) {
    this.onCompletionAccepted(i);
  }
}

class ApplyCompletionCodeActionCommand implements Command {
  static readonly ID = '_typescript.applyCompletionCodeAction';
  readonly id = ApplyCompletionCodeActionCommand.ID;
  constructor(private readonly client: IServiceClient) {}
  async execute(_file: string, codeActions: proto.CodeAction[]): Promise<boolean> {
    if (codeActions.length === 0) return true;

    if (codeActions.length === 1) {
      return applyCodeAction(this.client, codeActions[0], nulToken);
    }

    interface MyQuickPickItem extends vscode.QuickPickItem {
      index: number;
    }

    const selection = await vscode.window.showQuickPick<MyQuickPickItem>(
      codeActions.map(
        (action, i): MyQuickPickItem => ({
          label: action.description,
          description: '',
          index: i,
        })
      ),
      {
        placeHolder: localize('selectCodeAction', 'Select code action to apply'),
      }
    );

    if (!selection) return false;

    const action = codeActions[selection.index];
    if (!action) return false;

    return applyCodeAction(this.client, action, nulToken);
  }
}

interface CompletionConfiguration {
  readonly useCodeSnippetsOnMethodSuggest: boolean;
  readonly nameSuggestions: boolean;
  readonly pathSuggestions: boolean;
  readonly autoImportSuggestions: boolean;
}

namespace CompletionConfiguration {
  export const useCodeSnippetsOnMethodSuggest = 'suggest.completeFunctionCalls';
  export const nameSuggestions = 'suggest.names';
  export const pathSuggestions = 'suggest.paths';
  export const autoImportSuggestions = 'suggest.autoImports';

  export function getConfigurationForResource(
    modeId: string,
    resource: vscode.Uri
  ): CompletionConfiguration {
    const config = vscode.workspace.getConfiguration(modeId, resource);
    return {
      useCodeSnippetsOnMethodSuggest: config.get<boolean>(
        CompletionConfiguration.useCodeSnippetsOnMethodSuggest,
        false
      ),
      pathSuggestions: config.get<boolean>(CompletionConfiguration.pathSuggestions, true),
      autoImportSuggestions: config.get<boolean>(
        CompletionConfiguration.autoImportSuggestions,
        true
      ),
      nameSuggestions: config.get<boolean>(CompletionConfiguration.nameSuggestions, true),
    };
  }
}

class TypeScriptCompletionItemProvider implements vscode.CompletionItemProvider {
  static readonly triggerCharacters = ['.', '"', "'", '`', '/', '@', '<', '#'];

  constructor(
    private readonly client: IServiceClient,
    private readonly modeId: string,
    private readonly typingsStatus: TypingsStatus,
    private readonly fileConfigurationManager: FileConfigs,
    commandManager: Commands,
    private readonly telemetry: TelemetryReporter,
    onCompletionAccepted: (item: vscode.CompletionItem) => void
  ) {
    commandManager.register(new ApplyCompletionCodeActionCommand(this.client));
    commandManager.register(new CompositeCommand());
    commandManager.register(new CompletionAcceptedCommand(onCompletionAccepted));
  }

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    ct: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionList | null> {
    if (this.typingsStatus.isAcquiring) {
      return Promise.reject<vscode.CompletionList>({
        label: localize(
          {
            key: 'acquiringTypingsLabel',
            comment: [
              'Typings refers to the *.d.ts typings files that power our IntelliSense. It should not be localized',
            ],
          },
          'Acquiring typings...'
        ),
        detail: localize(
          {
            key: 'acquiringTypingsDetail',
            comment: [
              'Typings refers to the *.d.ts typings files that power our IntelliSense. It should not be localized',
            ],
          },
          'Acquiring typings definitions for IntelliSense.'
        ),
      });
    }
    const file = this.client.toOpenedPath(document);
    if (!file) return null;
    const line = document.lineAt(position.line);
    const completionConfiguration = CompletionConfiguration.getConfigurationForResource(
      this.modeId,
      document.uri
    );
    if (!this.shouldTrigger(context, line, position)) return null;
    const wordRange = document.getWordRangeAtPosition(position);
    await this.client.interruptGetErr(() =>
      this.fileConfigurationManager.ensureConfigurationForDocument(document, ct)
    );
    const args: proto.CompletionsRequestArgs = {
      ...typeConverters.Position.toFileLocationRequestArgs(file, position),
      includeExternalModuleExports: completionConfiguration.autoImportSuggestions,
      includeInsertTextCompletions: true,
      triggerCharacter: this.getTsTriggerCharacter(context),
    };
    let isNewIdentifierLocation = true;
    let isIncomplete = false;
    let isMemberCompletion = false;
    let dotAccessorContext: DotAccessorContext | undefined;
    let entries: ReadonlyArray<proto.CompletionEntry>;
    let metadata: any | undefined;
    if (this.client.api.gte(API.v300)) {
      const startTime = Date.now();
      let response: ServerResponse.Response<proto.CompletionInfoResponse> | undefined;
      try {
        response = await this.client.interruptGetErr(() =>
          this.client.execute('completionInfo', args, ct)
        );
      } finally {
        const duration: number = Date.now() - startTime;
        this.telemetry.logTelemetry('completions.execute', {
          duration: duration,
          type: response?.type ?? 'unknown',
          count:
            response?.type === 'response' && response.body
              ? response.body.entries.length
              : 0,
          updateGraphDurationMs:
            response?.type === 'response'
              ? response.performanceData?.updateGraphDurationMs
              : undefined,
        });
      }
      if (response.type !== 'response' || !response.body) return null;
      isNewIdentifierLocation = response.body.isNewIdentifierLocation;
      isMemberCompletion = response.body.isMemberCompletion;
      if (isMemberCompletion) {
        const dotMatch =
          line.text.slice(0, position.character).match(/\??\.\s*$/) || undefined;
        if (dotMatch) {
          const range = new vscode.Range(
            position.translate({ characterDelta: -dotMatch[0].length }),
            position
          );
          const text = document.getText(range);
          dotAccessorContext = { range, text };
        }
      }
      isIncomplete = response.metadata && response.metadata.isIncomplete;
      entries = response.body.entries;
      metadata = response.metadata;
    } else {
      const response = await this.client.interruptGetErr(() =>
        this.client.execute('completions', args, ct)
      );
      if (response.type !== 'response' || !response.body) return null;
      entries = response.body;
      metadata = response.metadata;
    }
    const completionContext = {
      isNewIdentifierLocation,
      isMemberCompletion,
      dotAccessorContext,
      isInValidCommitCharacterContext: this.isInValidCommitCharacterContext(
        document,
        position
      ),
      enableCallCompletions: !completionConfiguration.useCodeSnippetsOnMethodSuggest,
      wordRange,
      line: line.text,
      useCodeSnippetsOnMethodSuggest:
        completionConfiguration.useCodeSnippetsOnMethodSuggest,
      useFuzzyWordRangeLogic: this.client.api.lt(API.v390),
    };
    const items: MyCompletionItem[] = [];
    for (const e of entries) {
      if (!shouldExcludeCompletionEntry(e, completionConfiguration)) {
        items.push(
          new MyCompletionItem(position, document, e, completionContext, metadata)
        );
      }
    }
    return new vscode.CompletionList(items, isIncomplete);
  }

  private getTsTriggerCharacter(
    context: vscode.CompletionContext
  ): proto.CompletionsTriggerCharacter | undefined {
    switch (context.triggerCharacter) {
      case '@': // Workaround for https://github.com/Microsoft/TypeScript/issues/27321
        return this.client.api.gte(API.v310) && this.client.api.lt(API.v320)
          ? undefined
          : '@';
      case '#': // Workaround for https://github.com/microsoft/TypeScript/issues/36367
        return this.client.api.lt(API.v381) ? undefined : '#';
      case '.':
      case '"':
      case "'":
      case '`':
      case '/':
      case '<':
        return context.triggerCharacter;
    }
    return;
  }

  async resolveCompletionItem(
    item: MyCompletionItem,
    ct: vscode.CancellationToken
  ): Promise<MyCompletionItem | undefined> {
    const filepath = this.client.toOpenedPath(item.document);
    if (!filepath) return;
    const args: proto.CompletionDetailsRequestArgs = {
      ...typeConverters.Position.toFileLocationRequestArgs(filepath, item.position),
      entryNames: [
        item.tsEntry.source
          ? { name: item.tsEntry.name, source: item.tsEntry.source }
          : item.tsEntry.name,
      ],
    };
    const response = await this.client.interruptGetErr(() =>
      this.client.execute('completionEntryDetails', args, ct)
    );
    if (response.type !== 'response' || !response.body || !response.body.length)
      return item;
    const detail = response.body[0];
    if (!item.detail && detail.displayParts.length) {
      item.detail = Previewer.plain(detail.displayParts);
    }
    item.documentation = this.getDocumentation(detail, item);
    const codeAction = this.getCodeActions(detail, filepath);
    const commands: vscode.Command[] = [
      {
        command: CompletionAcceptedCommand.ID,
        title: '',
        arguments: [item],
      },
    ];
    if (codeAction.command) commands.push(codeAction.command);
    item.additionalTextEdits = codeAction.additionalTextEdits;
    if (item.useCodeSnippet) {
      const shouldCompleteFunction = await this.isValidFunctionCompletionContext(
        filepath,
        item.position,
        item.document,
        ct
      );
      if (shouldCompleteFunction) {
        const { snippet, parameterCount } = snippetForFunctionCall(
          item,
          detail.displayParts
        );
        item.insertText = snippet;
        if (parameterCount > 0) {
          commands.push({
            title: 'triggerParameterHints',
            command: 'editor.action.triggerParameterHints',
          });
        }
      }
    }
    if (commands.length) {
      if (commands.length === 1) {
        item.command = commands[0];
      } else {
        item.command = {
          command: CompositeCommand.ID,
          title: '',
          arguments: commands,
        };
      }
    }
    return item;
  }

  private getCodeActions(
    detail: proto.CompletionEntryDetails,
    filepath: string
  ): { command?: vscode.Command; additionalTextEdits?: vscode.TextEdit[] } {
    if (!detail.codeActions || !detail.codeActions.length) return {};
    const additionalTextEdits: vscode.TextEdit[] = [];
    let hasReaminingCommandsOrEdits = false;
    for (const tsAction of detail.codeActions) {
      if (tsAction.commands) hasReaminingCommandsOrEdits = true;
      if (tsAction.changes) {
        for (const change of tsAction.changes) {
          if (change.fileName === filepath) {
            additionalTextEdits.push(
              ...change.textChanges.map(typeConverters.TextEdit.fromCodeEdit)
            );
          } else {
            hasReaminingCommandsOrEdits = true;
          }
        }
      }
    }
    let command: vscode.Command | undefined = undefined;
    if (hasReaminingCommandsOrEdits) {
      command = {
        title: '',
        command: ApplyCompletionCodeActionCommand.ID,
        arguments: [
          filepath,
          detail.codeActions.map(
            (x): proto.CodeAction => ({
              commands: x.commands,
              description: x.description,
              changes: x.changes.filter((x) => x.fileName !== filepath),
            })
          ),
        ],
      };
    }
    return {
      command,
      additionalTextEdits: additionalTextEdits.length ? additionalTextEdits : undefined,
    };
  }

  private isInValidCommitCharacterContext(
    document: vscode.TextDocument,
    position: vscode.Position
  ): boolean {
    if (this.client.api.lt(API.v320)) {
      if (position.character > 1) {
        const preText = document.getText(
          new vscode.Range(position.line, 0, position.line, position.character)
        );
        return preText.match(/(\s|^)\.$/gi) === null;
      }
    }
    return true;
  }

  private shouldTrigger(
    context: vscode.CompletionContext,
    line: vscode.TextLine,
    position: vscode.Position
  ): boolean {
    if (context.triggerCharacter && this.client.api.lt(API.v290)) {
      if (context.triggerCharacter === '"' || context.triggerCharacter === "'") {
        const pre = line.text.slice(0, position.character);
        if (
          !pre.match(/\b(from|import)\s*["']$/) &&
          !pre.match(/\b(import|require)\(['"]$/)
        ) {
          return false;
        }
      }
      if (context.triggerCharacter === '/') {
        const pre = line.text.slice(0, position.character);
        if (
          !pre.match(/\b(from|import)\s*["'][^'"]*$/) &&
          !pre.match(/\b(import|require)\(['"][^'"]*$/)
        ) {
          return false;
        }
      }
      if (context.triggerCharacter === '@') {
        const pre = line.text.slice(0, position.character);
        if (!pre.match(/^\s*\*[ ]?@/) && !pre.match(/\/\*\*+[ ]?@/)) {
          return false;
        }
      }
      if (context.triggerCharacter === '<') return false;
    }
    return true;
  }

  private getDocumentation(
    detail: proto.CompletionEntryDetails,
    item: MyCompletionItem
  ): vscode.MarkdownString | undefined {
    const documentation = new vscode.MarkdownString();
    if (detail.source) {
      const importPath = `'${Previewer.plain(detail.source)}'`;
      const autoImportLabel = localize(
        'autoImportLabel',
        'Auto import from {0}',
        importPath
      );
      item.detail = `${autoImportLabel}\n${item.detail}`;
    }
    Previewer.addMdDocumentation(documentation, detail.documentation, detail.tags);
    return documentation.value.length ? documentation : undefined;
  }

  private async isValidFunctionCompletionContext(
    filepath: string,
    position: vscode.Position,
    document: vscode.TextDocument,
    ct: vscode.CancellationToken
  ): Promise<boolean> {
    try {
      const args: proto.FileLocationRequestArgs = typeConverters.Position.toFileLocationRequestArgs(
        filepath,
        position
      );
      const response = await this.client.execute('quickinfo', args, ct);
      if (response.type === 'response' && response.body) {
        switch (response.body.kind) {
          case 'var':
          case 'let':
          case 'const':
          case 'alias':
            return false;
        }
      }
    } catch {}
    const after = document.lineAt(position.line).text.slice(position.character);
    return after.match(/^[a-z_$0-9]*\s*\(/gi) === null;
  }
}

function shouldExcludeCompletionEntry(
  element: proto.CompletionEntry,
  completionConfiguration: CompletionConfiguration
) {
  return (
    (!completionConfiguration.nameSuggestions && element.kind === cproto.Kind.warning) ||
    (!completionConfiguration.pathSuggestions &&
      (element.kind === cproto.Kind.directory ||
        element.kind === cproto.Kind.script ||
        element.kind === cproto.Kind.externalModuleName)) ||
    (!completionConfiguration.autoImportSuggestions && element.hasAction)
  );
}

export function register(
  s: vscode.DocumentSelector,
  mode: string,
  c: IServiceClient,
  typingsStatus: TypingsStatus,
  fileConfigurationManager: FileConfigs,
  cmds: Commands,
  telemetry: TelemetryReporter,
  onCompletionAccepted: (_: vscode.CompletionItem) => void
) {
  return new ConfigDependent(mode, 'suggest.enabled', () =>
    vscode.languages.registerCompletionItemProvider(
      s,
      new TypeScriptCompletionItemProvider(
        c,
        mode,
        typingsStatus,
        fileConfigurationManager,
        cmds,
        telemetry,
        onCompletionAccepted
      ),
      ...TypeScriptCompletionItemProvider.triggerCharacters
    )
  );
}
