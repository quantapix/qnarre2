import * as vscode from 'vscode';
import * as path from 'path';

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;

export async function activate(n: vscode.Uri) {
  const ext = vscode.extensions.getExtension('qpx.proba')!;
  await ext.activate();
  try {
    doc = await vscode.workspace.openTextDocument(n);
    editor = await vscode.window.showTextDocument(doc);
    await sleep(2000);
  } catch (e) {
    console.error(e);
  }
}

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export const docPath = (p: string) => {
  return path.resolve(__dirname, '../fixture', p);
};
export const docUri = (p: string) => {
  return vscode.Uri.file(docPath(p));
};

export async function setTestContent(c: string) {
  const all = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
  return editor.edit((e) => e.replace(all, c));
}

export let dEol: string;
export let pEol: string;
