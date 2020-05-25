import { basename } from 'path';
import * as vsc from 'vscode';

import * as qd from './diagnostic';
import * as qx from './extras';

export const typescript = 'typescript';
export const typescriptreact = 'typescriptreact';
export const javascript = 'javascript';
export const javascriptreact = 'javascriptreact';
export const jsxTags = 'jsx-tags';

export function isSupported(d: vsc.TextDocument) {
  return (
    vsc.languages.match([typescript, typescriptreact, javascript, javascriptreact], d) > 0
  );
}

export function isTsDocument(d: vsc.TextDocument) {
  return vsc.languages.match([typescript, typescriptreact], d) > 0;
}

export interface Language {
  readonly id: string;
  readonly diagOwner: string;
  readonly diagSource: string;
  readonly diagLang: qd.Lang;
  readonly modes: string[];
  readonly configFilePattern?: RegExp;
  readonly isExternal?: boolean;
}

export const stdLanguages: Language[] = [
  {
    id: 'typescript',
    diagOwner: 'typescript',
    diagSource: 'ts',
    diagLang: qd.Lang.TypeScript,
    modes: [typescript, typescriptreact],
    configFilePattern: /^tsconfig(\..*)?\.json$/gi,
  },
  {
    id: 'javascript',
    diagOwner: 'typescript',
    diagSource: 'ts',
    diagLang: qd.Lang.JavaScript,
    modes: [javascript, javascriptreact],
    configFilePattern: /^jsconfig(\..*)?\.json$/gi,
  },
];

export function isTsConfigName(n: string) {
  return /^tsconfig\.(.+\.)?json$/i.test(basename(n));
}

function isConfigName(n: string) {
  return /^[jt]sconfig\.(.+\.)?json$/i.test(basename(n));
}

export function tsLike(r: vsc.Uri) {
  return /\.tsx?$/i.test(r.fsPath);
}

export function jsLike(r: vsc.Uri) {
  return /\.jsx?$/i.test(r.fsPath);
}

export class ManagedFileContextManager extends qx.Disposable {
  private static readonly ctxName = 'typescript.isManaged';

  private inContext = false;

  constructor(private readonly normPath: (_: vsc.Uri) => string | undefined) {
    super();
    vsc.window.onDidChangeActiveTextEditor(
      // eslint-disable-next-line @typescript-eslint/unbound-method
      this.onDidChangeActiveTextEditor,
      this,
      this.dispos
    );
    this.onDidChangeActiveTextEditor(vsc.window.activeTextEditor);
  }

  private onDidChangeActiveTextEditor(e?: vsc.TextEditor) {
    if (e) this.update(this.isManaged(e));
  }

  private update(n: boolean) {
    if (n === this.inContext) return;
    vsc.commands.executeCommand('setContext', ManagedFileContextManager.ctxName, n);
    this.inContext = n;
  }

  private isManaged(e: vsc.TextEditor) {
    return this.isScript(e) || this.isConfig(e);
  }

  private isScript(e: vsc.TextEditor) {
    return isSupported(e.document) && this.normPath(e.document.uri) !== undefined;
  }

  private isConfig(e: vsc.TextEditor) {
    return isConfigName(e.document.fileName);
  }
}
