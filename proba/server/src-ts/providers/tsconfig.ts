import * as jsonc from 'jsonc-parser';
import { basename, dirname, join } from 'path';
import * as vscode from 'vscode';
import { coalesce, flatten } from '../utils';

function mapChildren<R>(n: jsonc.Node | undefined, f: (x: jsonc.Node) => R): R[] {
  return n && n.type === 'array' && n.children ? n.children.map(f) : [];
}

class TsconfigLink implements vscode.DocumentLinkProvider {
  public provideDocumentLinks(
    d: vscode.TextDocument,
    _ct: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const root = jsonc.parseTree(d.getText());
    if (!root) return null;
    return coalesce([
      this.getExtendsLink(d, root),
      ...this.getFilesLinks(d, root),
      ...this.getReferencesLinks(d, root),
    ]);
  }

  private getExtendsLink(
    d: vscode.TextDocument,
    n: jsonc.Node
  ): vscode.DocumentLink | undefined {
    const e = jsonc.findNodeAtLocation(n, ['extends']);
    if (!this.isPathValue(e)) return;
    if (e.value.startsWith('.')) {
      return new vscode.DocumentLink(
        this.getRange(d, e),
        vscode.Uri.file(
          join(
            dirname(d.uri.fsPath),
            e.value + (e.value.endsWith('.json') ? '' : '.json')
          )
        )
      );
    }
    const workspaceFolderPath = vscode.workspace.getWorkspaceFolder(d.uri)!.uri.fsPath;
    return new vscode.DocumentLink(
      this.getRange(d, e),
      vscode.Uri.file(
        join(
          workspaceFolderPath,
          'node_modules',
          e.value + (e.value.endsWith('.json') ? '' : '.json')
        )
      )
    );
  }

  private getFilesLinks(d: vscode.TextDocument, n: jsonc.Node) {
    return mapChildren(jsonc.findNodeAtLocation(n, ['files']), (child) =>
      this.pathNodeToLink(d, child)
    );
  }

  private getReferencesLinks(d: vscode.TextDocument, n: jsonc.Node) {
    return mapChildren(jsonc.findNodeAtLocation(n, ['references']), (child) => {
      const pathNode = jsonc.findNodeAtLocation(child, ['path']);
      if (!this.isPathValue(pathNode)) return;
      return new vscode.DocumentLink(
        this.getRange(d, pathNode),
        basename(pathNode.value).endsWith('.json')
          ? this.getFileTarget(d, pathNode)
          : this.getFolderTarget(d, pathNode)
      );
    });
  }

  private pathNodeToLink(
    d: vscode.TextDocument,
    n: jsonc.Node | undefined
  ): vscode.DocumentLink | undefined {
    return this.isPathValue(n)
      ? new vscode.DocumentLink(this.getRange(d, n), this.getFileTarget(d, n))
      : undefined;
  }

  private isPathValue(n: jsonc.Node | undefined): n is jsonc.Node {
    return n && n.type === 'string' && n.value && !(n.value as string).includes('*');
  }

  private getFileTarget(d: vscode.TextDocument, n: jsonc.Node) {
    return vscode.Uri.file(join(dirname(d.uri.fsPath), n.value));
  }

  private getFolderTarget(d: vscode.TextDocument, n: jsonc.Node) {
    return vscode.Uri.file(join(dirname(d.uri.fsPath), n.value, 'tsconfig.json'));
  }

  private getRange(d: vscode.TextDocument, n: jsonc.Node) {
    const o = n.offset;
    const start = d.positionAt(o + 1);
    const end = d.positionAt(o + (n.length - 1));
    return new vscode.Range(start, end);
  }
}

export function register() {
  const ps: vscode.GlobPattern[] = ['**/[jt]sconfig.json', '**/[jt]sconfig.*.json'];
  const ls = ['json', 'jsonc'];
  const s: vscode.DocumentSelector = flatten(
    ls.map((language) =>
      ps.map((pattern): vscode.DocumentFilter => ({ language, pattern }))
    )
  );
  return vscode.languages.registerDocumentLinkProvider(s, new TsconfigLink());
}
