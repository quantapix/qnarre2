import * as vscode from 'vscode';
import { openProjectConfigForFile, ProjectType } from './utils/tsconfig';
import TypeScriptServiceClientHost from './typeScriptServiceClientHost';
import { Command, CommandManager } from './utils/commandManager';
import { Lazy } from './utils/lazy';
import { PluginManager } from './utils/plugins';
import { isTypeScriptDocument } from './utils/languageModeIds';

export class ConfigurePluginCommand implements Command {
  public readonly id = '_typescript.configurePlugin';

  public constructor(private readonly pluginManager: PluginManager) {}

  public execute(pluginId: string, configuration: any) {
    this.pluginManager.setConfiguration(pluginId, configuration);
  }
}

export class TypeScriptGoToProjectConfigCommand implements Command {
  public readonly id = 'typescript.goToProjectConfig';

  public constructor(
    private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>
  ) {}

  public execute() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      openProjectConfigForFile(
        ProjectType.TypeScript,
        this.lazyClientHost.value.serviceClient,
        editor.document.uri
      );
    }
  }
}

export class JavaScriptGoToProjectConfigCommand implements Command {
  public readonly id = 'javascript.goToProjectConfig';

  public constructor(
    private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>
  ) {}

  public execute() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      openProjectConfigForFile(
        ProjectType.JavaScript,
        this.lazyClientHost.value.serviceClient,
        editor.document.uri
      );
    }
  }
}

export class OpenTsServerLogCommand implements Command {
  public readonly id = 'typescript.openTsServerLog';

  public constructor(
    private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>
  ) {}

  public execute() {
    this.lazyClientHost.value.serviceClient.openTsServerLogFile();
  }
}

export class ReloadTypeScriptProjectsCommand implements Command {
  public readonly id = 'typescript.reloadProjects';

  public constructor(
    private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>
  ) {}

  public execute() {
    this.lazyClientHost.value.reloadProjects();
  }
}

export class ReloadJavaScriptProjectsCommand implements Command {
  public readonly id = 'javascript.reloadProjects';

  public constructor(
    private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>
  ) {}

  public execute() {
    this.lazyClientHost.value.reloadProjects();
  }
}

export class RestartTsServerCommand implements Command {
  public readonly id = 'typescript.restartTsServer';

  public constructor(
    private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>
  ) {}

  public execute() {
    this.lazyClientHost.value.serviceClient.restartTsServer();
  }
}

export class SelectTypeScriptVersionCommand implements Command {
  public readonly id = 'typescript.selectTypeScriptVersion';

  public constructor(
    private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>
  ) {}

  public execute() {
    this.lazyClientHost.value.serviceClient.showVersionPicker();
  }
}

export class LearnMoreAboutRefactoringsCommand implements Command {
  public static readonly id = '_typescript.learnMoreAboutRefactorings';
  public readonly id = LearnMoreAboutRefactoringsCommand.id;

  public execute() {
    const docUrl =
      vscode.window.activeTextEditor &&
      isTypeScriptDocument(vscode.window.activeTextEditor.document)
        ? 'https://go.microsoft.com/fwlink/?linkid=2114477'
        : 'https://go.microsoft.com/fwlink/?linkid=2116761';

    vscode.env.openExternal(vscode.Uri.parse(docUrl));
  }
}

export function registerCommands(
  commandManager: CommandManager,
  lazyClientHost: Lazy<TypeScriptServiceClientHost>,
  pluginManager: PluginManager
) {
  commandManager.register(new ReloadTypeScriptProjectsCommand(lazyClientHost));
  commandManager.register(new ReloadJavaScriptProjectsCommand(lazyClientHost));
  commandManager.register(new SelectTypeScriptVersionCommand(lazyClientHost));
  commandManager.register(new OpenTsServerLogCommand(lazyClientHost));
  commandManager.register(new RestartTsServerCommand(lazyClientHost));
  commandManager.register(new TypeScriptGoToProjectConfigCommand(lazyClientHost));
  commandManager.register(new JavaScriptGoToProjectConfigCommand(lazyClientHost));
  commandManager.register(new ConfigurePluginCommand(pluginManager));
  commandManager.register(new LearnMoreAboutRefactoringsCommand());
}
