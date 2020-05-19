import * as vscode from 'vscode';
import { Plugins } from './utils/plugin';
import { Command, Commands, Lazy } from './utils/extras';
import { openProjectConfigForFile, ProjectType } from './utils/tsconfig';
import ServiceClientHost from './typeScriptServiceClientHost';
import { isTypeScriptDocument } from '../utils/languageModeIds';

export class ReloadProjects implements Command {
  public readonly id: string;
  public constructor(p: string, private readonly host: Lazy<ServiceClientHost>) {
    this.id = `${p}.reloadProjects`;
  }
  public execute() {
    this.host.value.reloadProjects();
  }
}

export class SelectVersion implements Command {
  public readonly id: string;
  public constructor(p: string, private readonly host: Lazy<ServiceClientHost>) {
    this.id = `${p}.selectVersion`;
  }
  public execute() {
    this.host.value.serviceClient.showVersionPicker();
  }
}

export class OpenLog implements Command {
  public readonly id: string;
  public constructor(p: string, private readonly host: Lazy<ServiceClientHost>) {
    this.id = `${p}.openLog`;
  }
  public execute() {
    this.host.value.serviceClient.openLog();
  }
}

export class RestartServer implements Command {
  public readonly id: string;
  public constructor(p: string, private readonly host: Lazy<ServiceClientHost>) {
    this.id = '.restartServer';
  }
  public execute() {
    this.host.value.serviceClient.restartServer();
  }
}

export class GoToProjectConfig implements Command {
  public readonly id: string;
  public constructor(p: string, private readonly host: Lazy<ServiceClientHost>) {
    this.id = `${p}.goToProjectConfig`;
  }
  public execute() {
    const e = vscode.window.activeTextEditor;
    if (e) {
      openProjectConfigForFile(
        ProjectType.TypeScript,
        this.host.value.serviceClient,
        e.document.uri
      );
    }
  }
}

export class ConfigPlugin implements Command {
  public readonly id: string;
  public constructor(p: string, private readonly plugs: Plugins) {
    this.id = `${p}.configurePlugin`;
  }
  public execute(id: string, c: any) {
    this.plugs.setConfiguration(id, c);
  }
}

export class AboutRefactorings implements Command {
  public readonly id: string;
  public constructor(p: string) {
    this.id = `${p}.aboutRefactorings`;
  }
  public execute() {
    const url =
      vscode.window.activeTextEditor &&
      isTypeScriptDocument(vscode.window.activeTextEditor.document)
        ? 'https://go.microsoft.com/fwlink/?linkid=2114477'
        : 'https://go.microsoft.com/fwlink/?linkid=2116761';
    vscode.env.openExternal(vscode.Uri.parse(url));
  }
}

export function registerCommands(
  cs: Commands,
  host: Lazy<ServiceClientHost>,
  plugs: Plugins
) {
  cs.register(new ReloadProjects('typescript', host));
  cs.register(new ReloadProjects('javascript', host));
  cs.register(new SelectVersion('typescript', host));
  cs.register(new OpenLog('typescript', host));
  cs.register(new RestartServer('typescript', host));
  cs.register(new GoToProjectConfig('typescript', host));
  cs.register(new GoToProjectConfig('javascript', host));
  cs.register(new ConfigPlugin('typescript', plugs));
  cs.register(new AboutRefactorings('typescript'));
}
