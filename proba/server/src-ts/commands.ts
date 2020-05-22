import * as vscode from 'vscode';
import { Plugins } from './utils/plugin';
import * as qx from './utils/extras';
import { openProjectConfigForFile, ProjectType } from './utils/tsconfig';
import { ServiceClientHost } from './clientHost';
import { isTypeScriptDocument } from './utils/language';

export class ReloadProjects implements qx.Command {
  public readonly id: string;
  public constructor(p: string, private readonly host: qx.Lazy<ServiceClientHost>) {
    this.id = `${p}.reloadProjects`;
  }
  public execute() {
    this.host.value.reloadProjects();
  }
}

export class SelectVersion implements qx.Command {
  public readonly id: string;
  public constructor(p: string, private readonly host: qx.Lazy<ServiceClientHost>) {
    this.id = `${p}.selectVersion`;
  }
  public execute() {
    this.host.value.serviceClient.showVersionPicker();
  }
}

export class OpenLog implements qx.Command {
  public readonly id: string;
  public constructor(p: string, private readonly host: qx.Lazy<ServiceClientHost>) {
    this.id = `${p}.openLog`;
  }
  public execute() {
    this.host.value.serviceClient.openLog();
  }
}

export class RestartServer implements qx.Command {
  public readonly id: string;
  public constructor(p: string, private readonly host: qx.Lazy<ServiceClientHost>) {
    this.id = '.restartServer';
  }
  public execute() {
    this.host.value.serviceClient.restartServer();
  }
}

export class GoToProjectConfig implements qx.Command {
  public readonly id: string;
  public constructor(p: string, private readonly host: qx.Lazy<ServiceClientHost>) {
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

export class ConfigPlugin implements qx.Command {
  public readonly id: string;
  public constructor(p: string, private readonly plugins: Plugins) {
    this.id = `${p}.configurePlugin`;
  }
  public execute(id: string, c: any) {
    this.plugins.setConfig(id, c);
  }
}

export class AboutRefactorings implements qx.Command {
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
  cs: qx.Commands,
  host: qx.Lazy<ServiceClientHost>,
  plugins: Plugins
) {
  cs.register(new ReloadProjects('typescript', host));
  cs.register(new ReloadProjects('javascript', host));
  cs.register(new SelectVersion('typescript', host));
  cs.register(new OpenLog('typescript', host));
  cs.register(new RestartServer('typescript', host));
  cs.register(new GoToProjectConfig('typescript', host));
  cs.register(new GoToProjectConfig('javascript', host));
  cs.register(new ConfigPlugin('typescript', plugins));
  cs.register(new AboutRefactorings('typescript'));
}
