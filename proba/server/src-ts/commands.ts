import * as vscode from 'vscode';
import { Plugins } from './utils/plugin';
import * as qx from './utils/extras';
import { openProjectConfigForFile, ProjectType } from './utils/tsconfig';
import { ServiceClientHost } from './clientHost';
import { isTsDocument } from './utils/language';

export class ReloadProjects implements qx.Command {
  readonly id: string;
  constructor(p: string, private readonly host: qx.Lazy<ServiceClientHost>) {
    this.id = `${p}.reloadProjects`;
  }
  execute() {
    this.host.value.reloadProjects();
  }
}

export class SelectVersion implements qx.Command {
  readonly id: string;
  constructor(p: string, private readonly host: qx.Lazy<ServiceClientHost>) {
    this.id = `${p}.selectVersion`;
  }
  execute() {
    this.host.value.serviceClient.showVersionPicker();
  }
}

export class OpenLog implements qx.Command {
  readonly id: string;
  constructor(p: string, private readonly host: qx.Lazy<ServiceClientHost>) {
    this.id = `${p}.openLog`;
  }
  execute() {
    this.host.value.serviceClient.openLog();
  }
}

export class RestartServer implements qx.Command {
  readonly id: string;
  constructor(p: string, private readonly host: qx.Lazy<ServiceClientHost>) {
    this.id = '.restartServer';
  }
  execute() {
    this.host.value.serviceClient.restartServer();
  }
}

export class GoToProjectConfig implements qx.Command {
  readonly id: string;
  constructor(p: string, private readonly host: qx.Lazy<ServiceClientHost>) {
    this.id = `${p}.goToProjectConfig`;
  }
  execute() {
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
  readonly id: string;
  constructor(p: string, private readonly plugins: Plugins) {
    this.id = `${p}.configurePlugin`;
  }
  execute(id: string, c: any) {
    this.plugins.setConfig(id, c);
  }
}

export class AboutRefactorings implements qx.Command {
  readonly id: string;
  constructor(p: string) {
    this.id = `${p}.aboutRefactorings`;
  }
  execute() {
    const url =
      vscode.window.activeTextEditor &&
      isTsDocument(vscode.window.activeTextEditor.document)
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
