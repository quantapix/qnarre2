import { basename } from 'path';
import * as vscode from 'vscode';

export const typescript = 'typescript';
export const typescriptreact = 'typescriptreact';
export const javascript = 'javascript';
export const javascriptreact = 'javascriptreact';
export const jsxTags = 'jsx-tags';

export function isSupportedLanguageMode(d: vscode.TextDocument) {
  return (
    vscode.languages.match(
      [typescript, typescriptreact, javascript, javascriptreact],
      d
    ) > 0
  );
}

export function isTypeScriptDocument(d: vscode.TextDocument) {
  return vscode.languages.match([typescript, typescriptreact], d) > 0;
}

export const enum DiagLang {
  JavaScript,
  TypeScript,
}

export const allDiagLangs = [DiagLang.JavaScript, DiagLang.TypeScript];

export interface LangDesc {
  readonly id: string;
  readonly diagOwner: string;
  readonly diagSource: string;
  readonly diagLang: DiagLang;
  readonly modes: string[];
  readonly configFilePattern?: RegExp;
  readonly isExternal?: boolean;
}

export const standardLangDescs: LangDesc[] = [
  {
    id: 'typescript',
    diagOwner: 'typescript',
    diagSource: 'ts',
    diagLang: DiagLang.TypeScript,
    modes: [typescript, typescriptreact],
    configFilePattern: /^tsconfig(\..*)?\.json$/gi,
  },
  {
    id: 'javascript',
    diagOwner: 'typescript',
    diagSource: 'ts',
    diagLang: DiagLang.JavaScript,
    modes: [javascript, javascriptreact],
    configFilePattern: /^jsconfig(\..*)?\.json$/gi,
  },
];

export function isTsConfigName(n: string) {
  return /^tsconfig\.(.+\.)?json$/i.test(basename(n));
}

export function isJsConfigOrTsConfigFileName(n: string) {
  return /^[jt]sconfig\.(.+\.)?json$/i.test(basename(n));
}

export function doesResourceLookLikeATypeScriptFile(r: vscode.Uri) {
  return /\.tsx?$/i.test(r.fsPath);
}

export function doesResourceLookLikeAJavaScriptFile(r: vscode.Uri) {
  return /\.jsx?$/i.test(r.fsPath);
}
