/* eslint-disable @typescript-eslint/camelcase */
import * as vsc from 'vscode';
import * as nls from 'vscode-nls';
import type * as proto from '../protocol';

import { LearnMoreAboutRefactoringsCommand } from '../commands';
import * as qs from '../service';
import * as qu from '../utils';
import * as qx from '../utils/extras';
import * as qr from '../utils/registration';
import * as fileSchemes from '../utils/names';
import { TelemetryReporter } from '../utils/telemetry';
import * as qc from '../utils/convert';
import { FormattingOptionsManager } from '../utils/configs';

const localize = nls.loadMessageBundle();

namespace Experimental {
  export interface RefactorActionInfo extends proto.RefactorActionInfo {
    readonly error?: string;
  }
  export type RefactorTriggerReason = RefactorInvokedReason;
  export interface RefactorInvokedReason {
    readonly kind: 'invoked';
  }

  export interface GetApplicableRefactorsRequestArgs extends proto.FileRangeRequestArgs {
    readonly triggerReason?: RefactorTriggerReason;
  }
}

class ApplyRefactoring implements qx.Command {
  static readonly ID = '_typescript.applyRefactoring';
  readonly id = ApplyRefactoring.ID;

  constructor(
    private readonly client: qs.IServiceClient,
    private readonly tele: TelemetryReporter
  ) {}

  async execute(
    d: vsc.TextDocument,
    refactor: string,
    action: string,
    range: vsc.Range
  ): Promise<boolean> {
    const f = this.client.toOpenedPath(d);
    if (!f) return false;
    this.tele.logTelemetry('refactor.execute', {
      action: action,
    });
    const args: proto.GetEditsForRefactorRequestArgs = {
      ...qc.Range.toFileRangeRequestArgs(f, range),
      refactor,
      action,
    };
    const response = await this.client.execute('getEditsForRefactor', args, qx.nulToken);
    if (response.type !== 'response' || !response.body) return false;
    if (!response.body.edits.length) {
      vsc.window.showErrorMessage(
        localize('refactoringFailed', 'Could not apply refactoring')
      );
      return false;
    }
    const we = this.toWorkspaceEdit(response.body);
    if (!(await vsc.workspace.applyEdit(we))) return false;
    const l = response.body.renameLocation;
    if (l) {
      await vsc.commands.executeCommand('editor.action.rename', [
        d.uri,
        qc.Position.fromLocation(l),
      ]);
    }
    return true;
  }

  private toWorkspaceEdit(i: proto.RefactorEditInfo) {
    const we = new vsc.WorkspaceEdit();
    for (const e of i.edits) {
      const r = this.client.toResource(e.fileName);
      if (r.scheme === fileSchemes.file) {
        we.createFile(r, { ignoreIfExists: true });
      }
    }
    qc.WorkspaceEdit.withFileCodeEdits(we, this.client, i.edits);
    return we;
  }
}

class SelectRefactor implements qx.Command {
  static readonly ID = '_typescript.selectRefactoring';
  readonly id = SelectRefactor.ID;

  constructor(
    private readonly client: qs.IServiceClient,
    private readonly doRefactoring: ApplyRefactoring
  ) {}

  async execute(
    d: vsc.TextDocument,
    i: proto.ApplicableRefactorInfo,
    r: vsc.Range
  ): Promise<boolean> {
    const f = this.client.toOpenedPath(d);
    if (!f) return false;
    const s = await vsc.window.showQuickPick(
      i.actions.map(
        (action): vsc.QuickPickItem => ({
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
  readonly kind: vsc.CodeActionKind;
  matches(i: proto.RefactorActionInfo): boolean;
}

const Extract_Function = Object.freeze<CodeActionKind>({
  kind: vsc.CodeActionKind.RefactorExtract.append('function'),
  matches: (i) => i.name.startsWith('function_'),
});

const Extract_Constant = Object.freeze<CodeActionKind>({
  kind: vsc.CodeActionKind.RefactorExtract.append('constant'),
  matches: (i) => i.name.startsWith('constant_'),
});

const Extract_Type = Object.freeze<CodeActionKind>({
  kind: vsc.CodeActionKind.RefactorExtract.append('type'),
  matches: (i) => i.name.startsWith('Extract to type alias'),
});

const Extract_Interface = Object.freeze<CodeActionKind>({
  kind: vsc.CodeActionKind.RefactorExtract.append('interface'),
  matches: (i) => i.name.startsWith('Extract to interface'),
});

const Move_NewFile = Object.freeze<CodeActionKind>({
  kind: vsc.CodeActionKind.Refactor.append('move').append('newFile'),
  matches: (i) => i.name.startsWith('Move to a new file'),
});

const Rewrite_Import = Object.freeze<CodeActionKind>({
  kind: vsc.CodeActionKind.RefactorRewrite.append('import'),
  matches: (i) =>
    i.name.startsWith('Convert namespace import') ||
    i.name.startsWith('Convert named imports'),
});

const Rewrite_Export = Object.freeze<CodeActionKind>({
  kind: vsc.CodeActionKind.RefactorRewrite.append('export'),
  matches: (i) =>
    i.name.startsWith('Convert default export') ||
    i.name.startsWith('Convert named export'),
});

const Rewrite_Arrow_Braces = Object.freeze<CodeActionKind>({
  kind: vsc.CodeActionKind.RefactorRewrite.append('arrow').append('braces'),
  matches: (i) =>
    i.name.startsWith('Convert default export') ||
    i.name.startsWith('Convert named export'),
});

const Rewrite_Parameters_ToDestructured = Object.freeze<CodeActionKind>({
  kind: vsc.CodeActionKind.RefactorRewrite.append('parameters').append('toDestructured'),
  matches: (i) => i.name.startsWith('Convert parameters to destructured object'),
});

const Rewrite_Property_GenerateAccessors = Object.freeze<CodeActionKind>({
  kind: vsc.CodeActionKind.RefactorRewrite.append('property').append('generateAccessors'),
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

class Refactor implements vsc.CodeActionProvider {
  static readonly minApi = qr.API.default;

  constructor(
    private readonly client: qs.IServiceClient,
    private readonly formattingOptionsManager: FormattingOptionsManager,
    cmds: qx.Commands,
    tele: TelemetryReporter
  ) {
    const doRefactoringCommand = cmds.register(new ApplyRefactoring(this.client, tele));
    cmds.register(new SelectRefactor(this.client, doRefactoringCommand));
  }

  static readonly metadata = {
    providedCodeActionKinds: [
      vsc.CodeActionKind.Refactor,
      ...allKnownCodeActionKinds.map((x) => x.kind),
    ],
    documentation: [
      {
        kind: vsc.CodeActionKind.Refactor,
        command: {
          command: LearnMoreAboutRefactoringsCommand.id,
          title: localize(
            'refactor.documentation.title',
            'Learn more about JS/TS refactorings'
          ),
        },
      },
    ],
  } as vsc.CodeActionProviderMetadata;

  async provideCodeActions(
    d: vsc.TextDocument,
    rs: vsc.Range | vsc.Selection,
    ctx: vsc.CodeActionContext,
    ct: vsc.CancellationToken
  ): Promise<vsc.CodeAction[] | undefined> {
    if (!this.shouldTrigger(rs, ctx)) return;
    if (!this.client.toOpenedPath(d)) return;
    const response = await this.client.interruptGetErr(() => {
      const file = this.client.toOpenedPath(d);
      if (!file) return;
      this.formattingOptionsManager.ensureConfigurationForDocument(d, ct);
      const args: Experimental.GetApplicableRefactorsRequestArgs = {
        ...qc.Range.toFileRangeRequestArgs(file, rs),
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
    ctx: vsc.CodeActionContext
  ): Experimental.RefactorInvokedReason | undefined {
    if (!ctx.only) return;
    return { kind: 'invoked' };
  }

  private convertApplicableRefactors(
    body: proto.ApplicableRefactorInfo[],
    d: vsc.TextDocument,
    rs: vsc.Range | vsc.Selection
  ) {
    const actions: vsc.CodeAction[] = [];
    for (const info of body) {
      if (info.inlineable === false) {
        const a = new vsc.CodeAction(info.description, vsc.CodeActionKind.Refactor);
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
    d: vsc.TextDocument,
    info: proto.ApplicableRefactorInfo,
    rs: vsc.Range | vsc.Selection,
    allActions: readonly proto.RefactorActionInfo[]
  ) {
    const codeAction = new vsc.CodeAction(action.description, Refactor.getKind(action));
    if (action.error) {
      codeAction.disabled = { reason: action.error };
      return codeAction;
    }
    codeAction.command = {
      title: action.description,
      command: ApplyRefactoring.ID,
      arguments: [d, info.name, action.name, rs],
    };
    codeAction.isPreferred = Refactor.isPreferred(action, allActions);
    return codeAction;
  }

  private shouldTrigger(rs: vsc.Range | vsc.Selection, ctx: vsc.CodeActionContext) {
    if (ctx.only && !vsc.CodeActionKind.Refactor.contains(ctx.only)) {
      return false;
    }
    return rs instanceof vsc.Selection;
  }

  private static getKind(refactor: proto.RefactorActionInfo) {
    const match = allKnownCodeActionKinds.find((kind) => kind.matches(refactor));
    return match ? match.kind : vsc.CodeActionKind.Refactor;
  }

  private static isPreferred(
    action: proto.RefactorActionInfo,
    allActions: readonly proto.RefactorActionInfo[]
  ): boolean {
    if (Extract_Constant.matches(action)) {
      const getScope = (name: string) => {
        // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
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

  private appendInvalidActions(actions: vsc.CodeAction[]): vsc.CodeAction[] {
    if (!actions.some((a) => a.kind && Extract_Constant.kind.contains(a.kind))) {
      const disabledAction = new vsc.CodeAction(
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
      const disabledAction = new vsc.CodeAction(
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
  s: vsc.DocumentSelector,
  c: qs.IServiceClient,
  fs: FormattingOptionsManager,
  cmds: qx.Commands,
  tele: TelemetryReporter
) {
  return new qr.VersionDependent(c, Refactor.minApi, () => {
    return vsc.languages.registerCodeActionsProvider(
      s,
      new Refactor(c, fs, cmds, tele),
      Refactor.metadata
    );
  });
}
