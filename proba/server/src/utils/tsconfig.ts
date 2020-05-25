import * as path from 'path';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../protocol';
import { IServiceClient, ServerResponse } from '../service';
import { nulToken } from './extras';
import { ServiceConfig } from './configuration';

const localize = nls.loadMessageBundle();

export const enum ProjectType {
  TypeScript,
  JavaScript,
}

export function isImplicitConfig(n: string) {
  return n.startsWith('/dev/null/');
}

export function inferredProjectCompilerOptions(
  t: ProjectType,
  c: ServiceConfig
): Proto.ExternalProjectCompilerOptions {
  const pc: Proto.ExternalProjectCompilerOptions = {
    module: 'commonjs' as Proto.ModuleKind,
    target: 'es2016' as Proto.ScriptTarget,
    jsx: 'preserve' as Proto.JsxEmit,
  };
  if (c.checkJs) {
    pc.checkJs = true;
    if (t === ProjectType.TypeScript) pc.allowJs = true;
  }
  if (c.experimentalDecorators) pc.experimentalDecorators = true;
  if (t === ProjectType.TypeScript) pc.sourceMap = true;
  return pc;
}

function inferredProjectConfigSnippet(t: ProjectType, config: ServiceConfig) {
  const baseConfig = inferredProjectCompilerOptions(t, config);
  const compilerOptions = Object.keys(baseConfig).map(
    (key) => `"${key}": ${JSON.stringify(baseConfig[key])}`
  );
  return new vscode.SnippetString(`{
	"compilerOptions": {
		${compilerOptions.join(',\n\t\t')}$0
	},
	"exclude": [
		"node_modules",
		"**/node_modules/*"
	]
}`);
}

export async function openOrCreateConfig(
  t: ProjectType,
  root: string,
  c: ServiceConfig
): Promise<vscode.TextEditor | null> {
  const configFile = vscode.Uri.file(
    path.join(root, t === ProjectType.TypeScript ? 'tsconfig.json' : 'jsconfig.json')
  );
  const col = vscode.window.activeTextEditor?.viewColumn;
  try {
    const d = await vscode.workspace.openTextDocument(configFile);
    return vscode.window.showTextDocument(d, col);
  } catch {
    const d = await vscode.workspace.openTextDocument(
      configFile.with({ scheme: 'untitled' })
    );
    const e = await vscode.window.showTextDocument(d, col);
    if (e.document.getText().length === 0) {
      await e.insertSnippet(inferredProjectConfigSnippet(t, c));
    }
    return e;
  }
}

export async function openProjectConfigOrPromptToCreate(
  t: ProjectType,
  client: IServiceClient,
  root: string,
  configFileName: string
): Promise<void> {
  if (!isImplicitConfig(configFileName)) {
    const doc = await vscode.workspace.openTextDocument(configFileName);
    vscode.window.showTextDocument(doc, vscode.window.activeTextEditor?.viewColumn);
    return;
  }
  const CreateConfigItem: vscode.MessageItem = {
    title:
      t === ProjectType.TypeScript
        ? localize('typescript.configureTsconfigQuickPick', 'Configure tsconfig.json')
        : localize('typescript.configureJsconfigQuickPick', 'Configure jsconfig.json'),
  };
  const selected = await vscode.window.showInformationMessage(
    t === ProjectType.TypeScript
      ? localize(
          'typescript.noTypeScriptProjectConfig',
          'File is not part of a TypeScript project. Click [here]({0}) to learn more.',
          'https://go.microsoft.com/fwlink/?linkid=841896'
        )
      : localize(
          'typescript.noJavaScriptProjectConfig',
          'File is not part of a JavaScript project Click [here]({0}) to learn more.',
          'https://go.microsoft.com/fwlink/?linkid=759670'
        ),
    CreateConfigItem
  );
  switch (selected) {
    case CreateConfigItem:
      openOrCreateConfig(t, root, client.configuration);
      return;
  }
}

export async function openProjectConfigForFile(
  t: ProjectType,
  client: IServiceClient,
  resource: vscode.Uri
): Promise<void> {
  const rootPath = client.workspaceRootFor(resource);
  if (!rootPath) {
    vscode.window.showInformationMessage(
      localize(
        'typescript.pcNoWorkspace',
        'Please open a folder in VS Code to use a TypeScript or JavaScript project'
      )
    );
    return;
  }
  const file = client.toPath(resource);
  if (!file || !client.toPath(resource)) {
    vscode.window.showWarningMessage(
      localize(
        'typescript.pcUnsupportedFile',
        'Could not determine TypeScript or JavaScript project. Unsupported file type'
      )
    );
    return;
  }
  let res: ServerResponse.Response<protocol.ProjectInfoResponse> | undefined;
  try {
    res = await client.execute(
      'projectInfo',
      { file, needFileNameList: false },
      nulToken
    );
  } catch {}
  if (res?.type !== 'response' || !res.body) {
    vscode.window.showWarningMessage(
      localize(
        'typescript.pcCouldNotGetInfo',
        'Could not determine TypeScript or JavaScript project'
      )
    );
    return;
  }
  return openProjectConfigOrPromptToCreate(t, client, rootPath, res.body.configFileName);
}
