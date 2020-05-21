/* eslint-disable @typescript-eslint/camelcase */
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { LearnMoreAboutRefactoringsCommand } from '../commands/learnMoreAboutRefactorings';
import type * as Proto from '../protocol';
import { IServiceClient } from '../typescriptService';
import API from '../utils/api';
import { nulToken } from '../utils/cancellation';
import { Command, Commands } from '../utils/extras';
import { VersionDependentRegistration } from '../utils/registration';
import * as fileSchemes from '../utils/fileSchemes';
import { TelemetryReporter } from '../utils/telemetry';
import * as typeConverters from '../utils/convert';
import FormattingOptionsManager from './configs';

const localize = nls.loadMessageBundle();

namespace Experimental {
  export interface RefactorActionInfo extends Proto.RefactorActionInfo {
    readonly error?: string;
  }

  export type RefactorTriggerReason = RefactorInvokedReason;

  export interface RefactorInvokedReason {
    readonly kind: 'invoked';
  }

  export interface GetApplicableRefactorsRequestArgs extends Proto.FileRangeRequestArgs {
    readonly triggerReason?: RefactorTriggerReason;
  }
}

class ApplyRefactoring implements Command {
  static readonly ID = '_typescript.applyRefactoring';
  readonly id = ApplyRefactoring.ID;

  constructor(
    private readonly client: IServiceClient,
    private readonly telemetry: TelemetryReporter
  ) {}

  async execute(
    d: vscode.TextDocument,
    refactor: string,
    action: string,
    range: vscode.Range
  ): Promise<boolean> {
    const f = this.client.toOpenedPath(d);
    if (!f) return false;
    this.telemetry.logTelemetry('refactor.execute', {
      action: action,
    });
    const args: Proto.GetEditsForRefactorRequestArgs = {
      ...typeConverters.Range.toFileRangeRequestArgs(f, range),
      refactor,
      action,
    };
    const response = await this.client.execute('getEditsForRefactor', args, nulToken);
    if (response.type !== 'response' || !response.body) return false;
    if (!response.body.edits.length) {
      vscode.window.showErrorMessage(
        localize('refactoringFailed', 'Could not apply refactoring')
      );
      return false;
    }
    const we = this.toWorkspaceEdit(response.body);
    if (!(await vscode.workspace.applyEdit(we))) return false;
    const l = response.body.renameLocation;
    if (l) {
      await vscode.commands.executeCommand('editor.action.rename', [
        d.uri,
        typeConverters.Position.fromLocation(l),
      ]);
    }
    return true;
  }

  private toWorkspaceEdit(i: Proto.RefactorEditInfo) {
    const we = new vscode.WorkspaceEdit();
    for (const e of i.edits) {
      const r = this.client.toResource(e.fileName);
      if (r.scheme === fileSchemes.file) {
        we.createFile(r, { ignoreIfExists: true });
      }
    }
    typeConverters.WorkspaceEdit.withFileCodeEdits(we, this.client, body.edits);
    return we;
  }
}

class SelectRefactor implements Command {
  static readonly ID = '_typescript.selectRefactoring';
  readonly id = SelectRefactor.ID;

  constructor(
    private readonly client: IServiceClient,
    private readonly doRefactoring: ApplyRefactoring
  ) {}

  async execute(
    d: vscode.TextDocument,
    i: Proto.ApplicableRefactorInfo,
    r: vscode.Range
  ): Promise<boolean> {
    const f = this.client.toOpenedPath(d);
    if (!f) return false;
    const s = await vscode.window.showQuickPick(
      i.actions.map(
        (action): vscode.QuickPickItem => ({
          label: action.name,
          description: action.description,
        })
      )
    );
    if (!s) return false;
    return this.doRefactoring.execute(d, i.name, s.label, r);
  }
}

interface CodeActionKind {
  readonly kind: vscode.CodeActionKind;
  matches(i: Proto.RefactorActionInfo): boolean;
}

const Extract_Function = Object.freeze<CodeActionKind>({
  kind: vscode.CodeActionKind.RefactorExtract.append('function'),
  matches: (i) => i.name.startsWith('function_'),
});

const Extract_Constant = Object.freeze<CodeActionKind>({
  kind: vscode.CodeActionKind.RefactorExtract.append('constant'),
  matches: (i) => i.name.startsWith('constant_'),
});

const Extract_Type = Object.freeze<CodeActionKind>({
  kind: vscode.CodeActionKind.RefactorExtract.append('type'),
  matches: (i) => i.name.startsWith('Extract to type alias'),
});

const Extract_Interface = Object.freeze<CodeActionKind>({
  kind: vscode.CodeActionKind.RefactorExtract.append('interface'),
  matches: (i) => i.name.startsWith('Extract to interface'),
});

const Move_NewFile = Object.freeze<CodeActionKind>({
  kind: vscode.CodeActionKind.Refactor.append('move').append('newFile'),
  matches: (i) => i.name.startsWith('Move to a new file'),
});

const Rewrite_Import = Object.freeze<CodeActionKind>({
  kind: vscode.CodeActionKind.RefactorRewrite.append('import'),
  matches: (i) =>
    i.name.startsWith('Convert namespace import') ||
    i.name.startsWith('Convert named imports'),
});

const Rewrite_Export = Object.freeze<CodeActionKind>({
  kind: vscode.CodeActionKind.RefactorRewrite.append('export'),
  matches: (i) =>
    i.name.startsWith('Convert default export') ||
    i.name.startsWith('Convert named export'),
});

const Rewrite_Arrow_Braces = Object.freeze<CodeActionKind>({
  kind: vscode.CodeActionKind.RefactorRewrite.append('arrow').append('braces'),
  matches: (i) =>
    i.name.startsWith('Convert default export') ||
    i.name.startsWith('Convert named export'),
});

const Rewrite_Parameters_ToDestructured = Object.freeze<CodeActionKind>({
  kind: vscode.CodeActionKind.RefactorRewrite.append('parameters').append(
    'toDestructured'
  ),
  matches: (i) => i.name.startsWith('Convert parameters to destructured object'),
});

const Rewrite_Property_GenerateAccessors = Object.freeze<CodeActionKind>({
  kind: vscode.CodeActionKind.RefactorRewrite.append('property').append(
    'generateAccessors'
  ),
  matches: (i) => i.name.startsWith("Generate 'get' and 'set' accessors"),
});

const allKnownCodeActionKinds = [
  Extract_Function,
  Extract_Constant,
  Extract_Type,
  Extract_Interface,
  Move_NewFile,
  Rewrite_Import,
  Rewrite_Export,
  Rewrite_Arrow_Braces,
  Rewrite_Parameters_ToDestructured,
  Rewrite_Property_GenerateAccessors,
];

class TypeScriptRefactorProvider implements vscode.CodeActionProvider {
  static readonly minVersion = API.v240;

  constructor(
    private readonly client: IServiceClient,
    private readonly formattingOptionsManager: FormattingOptionsManager,
    cmds: Commands,
    telemetry: TelemetryReporter
  ) {
    const doRefactoringCommand = cmds.register(
      new ApplyRefactoring(this.client, telemetry)
    );
    cmds.register(new SelectRefactor(this.client, doRefactoringCommand));
  }

  static readonly metadata: vscode.CodeActionProviderMetadata = {
    providedCodeActionKinds: [
      vscode.CodeActionKind.Refactor,
      ...allKnownCodeActionKinds.map((x) => x.kind),
    ],
    documentation: [
      {
        kind: vscode.CodeActionKind.Refactor,
        command: {
          command: LearnMoreAboutRefactoringsCommand.id,
          title: localize(
            'refactor.documentation.title',
            'Learn more about JS/TS refactorings'
          ),
        },
      },
    ],
  };

  async provideCodeActions(
    d: vscode.TextDocument,
    rs: vscode.Range | vscode.Selection,
    ctx: vscode.CodeActionContext,
    ct: vscode.CancellationToken
  ): Promise<vscode.CodeAction[] | undefined> {
    if (!this.shouldTrigger(rs, ctx)) return;
    if (!this.client.toOpenedPath(d)) return;
    const response = await this.client.interruptGetErr(() => {
      const file = this.client.toOpenedPath(d);
      if (!file) return;
      this.formattingOptionsManager.ensureConfigurationForDocument(d, ct);
      const args: Experimental.GetApplicableRefactorsRequestArgs = {
        ...typeConverters.Range.toFileRangeRequestArgs(file, rs),
        triggerReason: this.toTsTriggerReason(ctx),
      };
      return this.client.execute('getApplicableRefactors', args, ct);
    });
    if (response?.type !== 'response' || !response.body) return;
    const actions = this.convertApplicableRefactors(response.body, d, rs);
    if (!ctx.only) return actions;
    return this.appendInvalidActions(actions);
  }

  private toTsTriggerReason(
    ctx: vscode.CodeActionContext
  ): Experimental.RefactorInvokedReason | undefined {
    if (!ctx.only) return;
    return { kind: 'invoked' };
  }

  private convertApplicableRefactors(
    body: Proto.ApplicableRefactorInfo[],
    d: vscode.TextDocument,
    rs: vscode.Range | vscode.Selection
  ) {
    const actions: vscode.CodeAction[] = [];
    for (const info of body) {
      if (info.inlineable === false) {
        const a = new vscode.CodeAction(info.description, vscode.CodeActionKind.Refactor);
        a.command = {
          title: info.description,
          command: SelectRefactor.ID,
          arguments: [d, info, rs],
        };
        actions.push(a);
      } else {
        for (const a of info.actions) {
          actions.push(this.refactorActionToCodeAction(a, d, info, rs, info.actions));
        }
      }
    }
    return actions;
  }

  private refactorActionToCodeAction(
    action: Experimental.RefactorActionInfo,
    d: vscode.TextDocument,
    info: Proto.ApplicableRefactorInfo,
    rs: vscode.Range | vscode.Selection,
    allActions: readonly Proto.RefactorActionInfo[]
  ) {
    const codeAction = new vscode.CodeAction(
      action.description,
      TypeScriptRefactorProvider.getKind(action)
    );
    if (action.error) {
      codeAction.disabled = { reason: action.error };
      return codeAction;
    }
    codeAction.command = {
      title: action.description,
      command: ApplyRefactoring.ID,
      arguments: [d, info.name, action.name, rs],
    };
    codeAction.isPreferred = TypeScriptRefactorProvider.isPreferred(action, allActions);
    return codeAction;
  }

  private shouldTrigger(
    rs: vscode.Range | vscode.Selection,
    ctx: vscode.CodeActionContext
  ) {
    if (ctx.only && !vscode.CodeActionKind.Refactor.contains(ctx.only)) {
      return false;
    }
    return rs instanceof vscode.Selection;
  }

  private static getKind(refactor: Proto.RefactorActionInfo) {
    const match = allKnownCodeActionKinds.find((kind) => kind.matches(refactor));
    return match ? match.kind : vscode.CodeActionKind.Refactor;
  }

  private static isPreferred(
    action: Proto.RefactorActionInfo,
    allActions: readonly Proto.RefactorActionInfo[]
  ): boolean {
    if (Extract_Constant.matches(action)) {
      const getScope = (name: string) => {
        const scope = name.match(/scope_(\d)/)?.[1];
        return scope ? +scope : undefined;
      };
      const scope = getScope(action.name);
      if (typeof scope !== 'number') return false;
      return allActions
        .filter((o) => o !== action && Extract_Constant.matches(o))
        .every((o) => {
          const s = getScope(o.name);
          return typeof s === 'number' ? scope < s : true;
        });
    }
    if (Extract_Type.matches(action) || Extract_Interface.matches(action)) {
      return true;
    }
    return false;
  }

  private appendInvalidActions(actions: vscode.CodeAction[]): vscode.CodeAction[] {
    if (!actions.some((a) => a.kind && Extract_Constant.kind.contains(a.kind))) {
      const disabledAction = new vscode.CodeAction(
        localize('extractConstant.disabled.title', 'Extract to constant'),
        Extract_Constant.kind
      );
      disabledAction.disabled = {
        reason: localize(
          'extractConstant.disabled.reason',
          'The current selection cannot be extracted'
        ),
      };
      disabledAction.isPreferred = true;
      actions.push(disabledAction);
    }
    if (
      !actions.some(
        (action) => action.kind && Extract_Function.kind.contains(action.kind)
      )
    ) {
      const disabledAction = new vscode.CodeAction(
        localize('extractFunction.disabled.title', 'Extract to function'),
        Extract_Function.kind
      );
      disabledAction.disabled = {
        reason: localize(
          'extractFunction.disabled.reason',
          'The current selection cannot be extracted'
        ),
      };
      actions.push(disabledAction);
    }
    return actions;
  }
}

export function register(
  s: vscode.DocumentSelector,
  c: IServiceClient,
  formats: FormattingOptionsManager,
  cmds: Commands,
  telemetry: TelemetryReporter
) {
  return new VersionDependentRegistration(
    c,
    TypeScriptRefactorProvider.minVersion,
    () => {
      return vscode.languages.registerCodeActionsProvider(
        s,
        new TypeScriptRefactorProvider(c, formats, cmds, telemetry),
        TypeScriptRefactorProvider.metadata
      );
    }
  );
}
