import {
  CancellationToken,
  ExecuteCommandParams,
  ResponseError,
} from 'vscode-languageserver';

import { AnalyzerService } from './analyzer/service';
import { OperationCanceledException } from './utils/cancellationUtils';
import { createDeferred } from './utils/deferred';
import { pathToUri } from './utils/pathUtils';
import { LanguageServerInterface, WorkspaceServiceInstance } from './languageServerBase';
import { AnalyzerServiceExecutor } from './languageService/analyzerServiceExecutor';
import { uriToPath } from './utils/pathUtils';
import { convertTextEdits } from './utils/textEditUtils';

export const enum Commands {
  createTypeStub = 'pyright.createtypestub',
  restartServer = 'pyright.restartserver',
  orderImports = 'pyright.organizeimports',
  addMissingOptionalToParam = 'pyright.addoptionalforparam',
}

export interface ServerCommand {
  execute(ps: ExecuteCommandParams, token: CancellationToken): Promise<any>;
}

export class QuickActionCommand implements ServerCommand {
  constructor(private _ls: LanguageServerInterface) {}

  async execute(ps: ExecuteCommandParams, token: CancellationToken): Promise<any> {
    if (ps.arguments && ps.arguments.length >= 1) {
      const docUri = ps.arguments[0];
      const otherArgs = ps.arguments.slice(1);
      const filePath = uriToPath(docUri);
      const ws = await this._ls.getWorkspaceForFile(filePath);
      if (ps.command === Commands.orderImports && ws.disableOrganizeImports) return [];
      const editActions = ws.service.performQuickAction(
        filePath,
        ps.command,
        otherArgs,
        token
      );
      return convertTextEdits(docUri, editActions);
    }
  }
}

export class CommandController implements ServerCommand {
  private _createStub: CreateTypeStubCommand;
  private _restartServer: RestartServerCommand;
  private _quickAction: QuickActionCommand;

  constructor(ls: LanguageServerInterface) {
    this._createStub = new CreateTypeStubCommand(ls);
    this._restartServer = new RestartServerCommand(ls);
    this._quickAction = new QuickActionCommand(ls);
  }

  async execute(ps: ExecuteCommandParams, token: CancellationToken): Promise<any> {
    switch (ps.command) {
      case Commands.orderImports:
      case Commands.addMissingOptionalToParam: {
        return this._quickAction.execute(ps, token);
      }
      case Commands.createTypeStub: {
        return this._createStub.execute(ps, token);
      }
      case Commands.restartServer: {
        return this._restartServer.execute(ps);
      }
      default: {
        return new ResponseError<string>(1, 'Unsupported command');
      }
    }
  }

  isLongRunningCommand(command: string): boolean {
    switch (command) {
      case Commands.createTypeStub:
        return true;
      default:
        return false;
    }
  }
}

export class RestartServerCommand implements ServerCommand {
  constructor(private _ls: LanguageServerInterface) {}

  async execute(_: ExecuteCommandParams): Promise<any> {
    this._ls.restart();
  }
}

export class CreateTypeStubCommand implements ServerCommand {
  constructor(private _ls: LanguageServerInterface) {}

  async execute(ps: ExecuteCommandParams, token: CancellationToken): Promise<any> {
    if (ps.arguments && ps.arguments.length >= 2) {
      const workspaceRoot = ps.arguments[0];
      const importName = ps.arguments[1];
      const callingFile = ps.arguments[2];
      const service = await this._createTypeStubService(callingFile);
      const workspace: WorkspaceServiceInstance = {
        name: `Create Type Stub ${importName}`,
        rootPath: workspaceRoot,
        rootUri: pathToUri(workspaceRoot),
        service: service,
        disableServices: true,
        disableOrganizeImports: true,
        isInitialized: createDeferred<boolean>(),
      };

      const serverSettings = await this._ls.getSettings(workspace);
      AnalyzerServiceExecutor.runWithOptions(
        this._ls.rootPath,
        workspace,
        serverSettings,
        importName,
        false
      );

      try {
        await service.writeTypeStubInBackground(token);
        service.dispose();
        const infoMessage = `Type stub was successfully created for '${importName}'.`;
        this._ls.window.showInformationMessage(infoMessage);
        this._handlePostCreateTypeStub();
      } catch (err) {
        const isCancellation = OperationCanceledException.is(err);
        if (isCancellation) {
          const errMessage = `Type stub creation for '${importName}' was canceled`;
          this._ls.console.error(errMessage);
        } else {
          let errMessage = '';
          if (err instanceof Error) errMessage = ': ' + err.message;
          errMessage =
            `An error occurred when creating type stub for '${importName}'` + errMessage;
          this._ls.console.error(errMessage);
          this._ls.window.showErrorMessage(errMessage);
        }
      }
    }
  }

  private async _createTypeStubService(callingFile?: string): Promise<AnalyzerService> {
    return this._createAnalyzerService(callingFile);
  }

  private async _createAnalyzerService(callingFile: string | undefined) {
    this._ls.console.log('Starting type stub service instance');
    if (callingFile) {
      const workspace = await this._ls.getWorkspaceForFile(callingFile);
      return workspace.service.clone('Type stub', this._ls.createBackgroundAnalysis());
    }
    return new AnalyzerService('Type stub', this._ls.fs, this._ls.console);
  }

  private _handlePostCreateTypeStub() {
    this._ls.reanalyze();
  }
}
