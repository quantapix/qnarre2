import * as vscode from 'vscode';
import * as proto from './protocol';

import { Buffer } from './utils/buffer';
import { API } from './utils/registration';
import { ServiceConfig } from './utils/configs';
import { Plugins } from './utils/plugin';

export namespace ServerResponse {
  export class Cancelled {
    readonly type = 'cancelled';
    constructor(public readonly reason: string) {}
  }
  export const NoContent = { type: 'noContent' } as const;
  export type Response<T extends proto.Response> = T | Cancelled | typeof NoContent;
}

interface StandardRequests {
  applyCodeActionCommand: [
    proto.ApplyCodeActionCommandRequestArgs,
    proto.ApplyCodeActionCommandResponse
  ];
  completionEntryDetails: [
    proto.CompletionDetailsRequestArgs,
    proto.CompletionDetailsResponse
  ];
  completionInfo: [proto.CompletionsRequestArgs, proto.CompletionInfoResponse];
  completions: [proto.CompletionsRequestArgs, proto.CompletionsResponse];
  configure: [proto.ConfigureRequestArguments, proto.ConfigureResponse];
  definition: [proto.FileLocationRequestArgs, proto.DefinitionResponse];
  definitionAndBoundSpan: [
    proto.FileLocationRequestArgs,
    proto.DefinitionInfoAndBoundSpanReponse
  ];
  docCommentTemplate: [proto.FileLocationRequestArgs, proto.DocCommandTemplateResponse];
  documentHighlights: [
    proto.DocumentHighlightsRequestArgs,
    proto.DocumentHighlightsResponse
  ];
  format: [proto.FormatRequestArgs, proto.FormatResponse];
  formatonkey: [proto.FormatOnKeyRequestArgs, proto.FormatResponse];
  getApplicableRefactors: [
    proto.GetApplicableRefactorsRequestArgs,
    proto.GetApplicableRefactorsResponse
  ];
  getCodeFixes: [proto.CodeFixRequestArgs, proto.CodeFixResponse];
  getCombinedCodeFix: [
    proto.GetCombinedCodeFixRequestArgs,
    proto.GetCombinedCodeFixResponse
  ];
  getEditsForFileRename: [
    proto.GetEditsForFileRenameRequestArgs,
    proto.GetEditsForFileRenameResponse
  ];
  getEditsForRefactor: [
    proto.GetEditsForRefactorRequestArgs,
    proto.GetEditsForRefactorResponse
  ];
  getOutliningSpans: [proto.FileRequestArgs, proto.OutliningSpansResponse];
  getSupportedCodeFixes: [null, proto.GetSupportedCodeFixesResponse];
  implementation: [proto.FileLocationRequestArgs, proto.ImplementationResponse];
  jsxClosingTag: [proto.JsxClosingTagRequestArgs, proto.JsxClosingTagResponse];
  navto: [proto.NavtoRequestArgs, proto.NavtoResponse];
  navtree: [proto.FileRequestArgs, proto.NavTreeResponse];
  organizeImports: [proto.OrganizeImportsRequestArgs, proto.OrganizeImportsResponse];
  projectInfo: [proto.ProjectInfoRequestArgs, proto.ProjectInfoResponse];
  quickinfo: [proto.FileLocationRequestArgs, proto.QuickInfoResponse];
  references: [proto.FileLocationRequestArgs, proto.ReferencesResponse];
  rename: [proto.RenameRequestArgs, proto.RenameResponse];
  selectionRange: [proto.SelectionRangeRequestArgs, proto.SelectionRangeResponse];
  signatureHelp: [proto.SignatureHelpRequestArgs, proto.SignatureHelpResponse];
  typeDefinition: [proto.FileLocationRequestArgs, proto.TypeDefinitionResponse];
  updateOpen: [proto.UpdateOpenRequestArgs, proto.Response];
  prepareCallHierarchy: [
    proto.FileLocationRequestArgs,
    proto.PrepareCallHierarchyResponse
  ];
  provideCallHierarchyIncomingCalls: [
    proto.FileLocationRequestArgs,
    proto.ProvideCallHierarchyIncomingCallsResponse
  ];
  provideCallHierarchyOutgoingCalls: [
    proto.FileLocationRequestArgs,
    proto.ProvideCallHierarchyOutgoingCallsResponse
  ];
}

interface NoResponseRequests {
  open: [proto.OpenRequestArgs, null];
  close: [proto.FileRequestArgs, null];
  change: [proto.ChangeRequestArgs, null];
  compilerOptionsForInferredProjects: [
    proto.SetCompilerOptionsForInferredProjectsArgs,
    null
  ];
  reloadProjects: [null, null];
  configurePlugin: [proto.ConfigurePluginRequest, proto.ConfigurePluginResponse];
}

interface AsyncRequests {
  geterr: [proto.GeterrRequestArgs, proto.Response];
  geterrForProject: [proto.GeterrForProjectRequestArgs, proto.Response];
}

export type TypeScriptRequests = StandardRequests & NoResponseRequests & AsyncRequests;

export type ExecConfig = {
  readonly slow?: boolean;
  readonly nonRecoverable?: boolean;
  readonly cancelOnResourceChange?: vscode.Uri;
};

export interface IServiceClient {
  toPath(_: vscode.Uri): string | undefined;
  toNormPath(_: vscode.Uri): string | undefined;
  toOpenedPath(_: vscode.TextDocument): string | undefined;
  toResource(filepath: string): vscode.Uri;
  workspaceRootFor(_: vscode.Uri): string | undefined;

  readonly onServerStarted: vscode.Event<API>;
  readonly onServiceStateChanged: vscode.Event<
    proto.ProjectLanguageServiceStateEventBody
  >;
  readonly onDidBeginInstallTypes: vscode.Event<proto.BeginInstallTypesEventBody>;
  readonly onDidEndInstallTypes: vscode.Event<proto.EndInstallTypesEventBody>;
  readonly onTypesInstallerInitFailed: vscode.Event<
    proto.TypesInstallerInitializationFailedEventBody
  >;

  onReady(f: () => void): Promise<void>;

  showVersionPicker(): void;

  readonly api: API;
  readonly plugins: Plugins;
  readonly configuration: ServiceConfig;
  readonly buffer: Buffer;

  execute<K extends keyof StandardRequests>(
    cmd: K,
    args: StandardRequests[K][0],
    ct: vscode.CancellationToken,
    config?: ExecConfig
  ): Promise<ServerResponse.Response<StandardRequests[K][1]>>;

  executeNoResponse<K extends keyof NoResponseRequests>(
    cmd: K,
    args: NoResponseRequests[K][0]
  ): void;

  executeAsync<K extends keyof AsyncRequests>(
    cmd: K,
    args: AsyncRequests[K][0],
    ct: vscode.CancellationToken
  ): Promise<ServerResponse.Response<proto.Response>>;

  interruptGetErr<R>(f: () => R): R;
}
