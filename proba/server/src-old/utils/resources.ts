import * as vscode from 'vscode';

export interface WebviewResourceProvider {
  asWebviewUri(resource: vscode.Uri): vscode.Uri;

  readonly cspSource: string;
}

export function normalizeResource(base: vscode.Uri, resource: vscode.Uri): vscode.Uri {
  if (base.authority && !resource.authority) {
    const driveMatch = resource.path.match(/^\/(\w):\//);
    if (driveMatch) {
      return vscode.Uri.file(
        `\\\\localhost\\${driveMatch[1]}$\\${resource.fsPath.replace(/^\w:\\/, '')}`
      ).with({
        fragment: resource.fragment,
        query: resource.query,
      });
    }
  }
  return resource;
}
