import * as vscode from 'vscode';
import { extname } from 'path';

import { MarkdownEngine } from '../src-md/markdownEngine';
import { TableOfContentsProvider } from '../src-md/tableOfContentsProvider';
import { isMarkdownFile } from '../util/file';
import {
  MarkdownPreviewManager,
  DynamicPreviewSettings,
} from '../src-md/features/previewManager';
import { TelemetryReporter } from '../src-md/telemetryReporter';
import { PreviewSecuritySelector } from '../src-md/security';
import { SkinnyTextDocument } from '../src-md/tableOfContentsProvider';

export interface Command {
  readonly id: string;

  execute(...args: any[]): void;
}

export class CommandManager {
  private readonly commands = new Map<string, vscode.Disposable>();

  public dispose() {
    for (const registration of this.commands.values()) {
      registration.dispose();
    }
    this.commands.clear();
  }

  public register<T extends Command>(command: T): T {
    this.registerCommand(command.id, command.execute, command);
    return command;
  }

  private registerCommand(id: string, impl: (...args: any[]) => void, thisArg?: any) {
    if (this.commands.has(id)) {
      return;
    }

    this.commands.set(id, vscode.commands.registerCommand(id, impl, thisArg));
  }
}

export interface OpenDocumentLinkArgs {
  readonly path: string;
  readonly fragment: string;
  readonly fromResource: any;
}

enum OpenMarkdownLinks {
  beside = 'beside',
  currentGroup = 'currentGroup',
}

export class OpenDocumentLinkCommand implements Command {
  private static readonly id = '_markdown.openDocumentLink';
  public readonly id = OpenDocumentLinkCommand.id;

  public static createCommandUri(
    fromResource: vscode.Uri,
    path: string,
    fragment: string
  ): vscode.Uri {
    return vscode.Uri.parse(
      `command:${OpenDocumentLinkCommand.id}?${encodeURIComponent(
        JSON.stringify(<OpenDocumentLinkArgs>{
          path: encodeURIComponent(path),
          fragment,
          fromResource: encodeURIComponent(fromResource.toString(true)),
        })
      )}`
    );
  }

  public constructor(private readonly engine: MarkdownEngine) {}

  public execute(args: OpenDocumentLinkArgs) {
    const fromResource = vscode.Uri.parse(decodeURIComponent(args.fromResource));
    const targetPath = decodeURIComponent(args.path);
    const column = this.getViewColumn(fromResource);
    return this.tryOpen(targetPath, args, column).catch(() => {
      if (targetPath && extname(targetPath) === '') {
        return this.tryOpen(targetPath + '.md', args, column);
      }
      const targetResource = vscode.Uri.file(targetPath);
      return Promise.resolve(undefined)
        .then(() => vscode.commands.executeCommand('vscode.open', targetResource, column))
        .then(() => undefined);
    });
  }

  private async tryOpen(
    path: string,
    args: OpenDocumentLinkArgs,
    column: vscode.ViewColumn
  ) {
    const resource = vscode.Uri.file(path);
    if (
      vscode.window.activeTextEditor &&
      isMarkdownFile(vscode.window.activeTextEditor.document)
    ) {
      if (
        !path ||
        vscode.window.activeTextEditor.document.uri.fsPath === resource.fsPath
      ) {
        return this.tryRevealLine(vscode.window.activeTextEditor, args.fragment);
      }
    }

    const stat = await vscode.workspace.fs.stat(resource);
    if (stat.type === vscode.FileType.Directory) {
      return vscode.commands.executeCommand('revealInExplorer', resource);
    }

    return vscode.workspace
      .openTextDocument(resource)
      .then((document) => vscode.window.showTextDocument(document, column))
      .then((editor) => this.tryRevealLine(editor, args.fragment));
  }

  private getViewColumn(resource: vscode.Uri): vscode.ViewColumn {
    const config = vscode.workspace.getConfiguration('markdown', resource);
    const openLinks = config.get<OpenMarkdownLinks>(
      'links.openLocation',
      OpenMarkdownLinks.currentGroup
    );
    switch (openLinks) {
      case OpenMarkdownLinks.beside:
        return vscode.ViewColumn.Beside;
      case OpenMarkdownLinks.currentGroup:
      default:
        return vscode.ViewColumn.Active;
    }
  }

  private async tryRevealLine(editor: vscode.TextEditor, fragment?: string) {
    if (editor && fragment) {
      const toc = new TableOfContentsProvider(this.engine, editor.document);
      const entry = await toc.lookup(fragment);
      if (entry) {
        return editor.revealRange(
          new vscode.Range(entry.line, 0, entry.line, 0),
          vscode.TextEditorRevealType.AtTop
        );
      }
      const lineNumberFragment = fragment.match(/^L(\d+)$/i);
      if (lineNumberFragment) {
        const line = +lineNumberFragment[1] - 1;
        if (!isNaN(line)) {
          return editor.revealRange(
            new vscode.Range(line, 0, line, 0),
            vscode.TextEditorRevealType.AtTop
          );
        }
      }
    }
  }
}

export async function resolveLinkToMarkdownFile(
  path: string
): Promise<vscode.Uri | undefined> {
  try {
    const standardLink = await tryResolveLinkToMarkdownFile(path);
    if (standardLink) {
      return standardLink;
    }
  } catch {
    // Noop
  }

  // If no extension, try with `.md` extension
  if (extname(path) === '') {
    return tryResolveLinkToMarkdownFile(path + '.md');
  }

  return undefined;
}

async function tryResolveLinkToMarkdownFile(
  path: string
): Promise<vscode.Uri | undefined> {
  const resource = vscode.Uri.file(path);

  let document: vscode.TextDocument;
  try {
    document = await vscode.workspace.openTextDocument(resource);
  } catch {
    return undefined;
  }
  if (isMarkdownFile(document)) {
    return document.uri;
  }
  return undefined;
}

interface ShowPreviewSettings {
  readonly sideBySide?: boolean;
  readonly locked?: boolean;
}

async function showPreview(
  webviewManager: MarkdownPreviewManager,
  telemetryReporter: TelemetryReporter,
  uri: vscode.Uri | undefined,
  previewSettings: ShowPreviewSettings
): Promise<any> {
  let resource = uri;
  if (!(resource instanceof vscode.Uri)) {
    if (vscode.window.activeTextEditor) {
      // we are relaxed and don't check for markdown files
      resource = vscode.window.activeTextEditor.document.uri;
    }
  }

  if (!(resource instanceof vscode.Uri)) {
    if (!vscode.window.activeTextEditor) {
      // this is most likely toggling the preview
      return vscode.commands.executeCommand('markdown.showSource');
    }
    // nothing found that could be shown or toggled
    return;
  }

  const resourceColumn =
    (vscode.window.activeTextEditor && vscode.window.activeTextEditor.viewColumn) ||
    vscode.ViewColumn.One;
  webviewManager.openDynamicPreview(resource, {
    resourceColumn: resourceColumn,
    previewColumn: previewSettings.sideBySide ? resourceColumn + 1 : resourceColumn,
    locked: !!previewSettings.locked,
  });

  telemetryReporter.sendTelemetryEvent('openPreview', {
    where: previewSettings.sideBySide ? 'sideBySide' : 'inPlace',
    how: uri instanceof vscode.Uri ? 'action' : 'pallete',
  });
}

export class ShowPreviewCommand implements Command {
  public readonly id = 'markdown.showPreview';

  public constructor(
    private readonly webviewManager: MarkdownPreviewManager,
    private readonly telemetryReporter: TelemetryReporter
  ) {}

  public execute(
    mainUri?: vscode.Uri,
    allUris?: vscode.Uri[],
    previewSettings?: DynamicPreviewSettings
  ) {
    for (const uri of Array.isArray(allUris) ? allUris : [mainUri]) {
      showPreview(this.webviewManager, this.telemetryReporter, uri, {
        sideBySide: false,
        locked: previewSettings && previewSettings.locked,
      });
    }
  }
}

export class ShowPreviewToSideCommand implements Command {
  public readonly id = 'markdown.showPreviewToSide';

  public constructor(
    private readonly webviewManager: MarkdownPreviewManager,
    private readonly telemetryReporter: TelemetryReporter
  ) {}

  public execute(uri?: vscode.Uri, previewSettings?: DynamicPreviewSettings) {
    showPreview(this.webviewManager, this.telemetryReporter, uri, {
      sideBySide: true,
      locked: previewSettings && previewSettings.locked,
    });
  }
}

export class ShowLockedPreviewToSideCommand implements Command {
  public readonly id = 'markdown.showLockedPreviewToSide';

  public constructor(
    private readonly webviewManager: MarkdownPreviewManager,
    private readonly telemetryReporter: TelemetryReporter
  ) {}

  public execute(uri?: vscode.Uri) {
    showPreview(this.webviewManager, this.telemetryReporter, uri, {
      sideBySide: true,
      locked: true,
    });
  }
}

export class ShowSourceCommand implements Command {
  public readonly id = 'markdown.showSource';

  public constructor(private readonly previewManager: MarkdownPreviewManager) {}

  public execute() {
    const { activePreviewResource, activePreviewResourceColumn } = this.previewManager;
    if (activePreviewResource && activePreviewResourceColumn) {
      return vscode.workspace.openTextDocument(activePreviewResource).then((document) => {
        vscode.window.showTextDocument(document, activePreviewResourceColumn);
      });
    }
    return undefined;
  }
}

export class RefreshPreviewCommand implements Command {
  public readonly id = 'markdown.preview.refresh';

  public constructor(
    private readonly webviewManager: MarkdownPreviewManager,
    private readonly engine: MarkdownEngine
  ) {}

  public execute() {
    this.engine.cleanCache();
    this.webviewManager.refresh();
  }
}

export class ShowPreviewSecuritySelectorCommand implements Command {
  public readonly id = 'markdown.showPreviewSecuritySelector';

  public constructor(
    private readonly previewSecuritySelector: PreviewSecuritySelector,
    private readonly previewManager: MarkdownPreviewManager
  ) {}

  public execute(resource: string | undefined) {
    if (this.previewManager.activePreviewResource) {
      this.previewSecuritySelector.showSecuritySelectorForResource(
        this.previewManager.activePreviewResource
      );
    } else if (resource) {
      const source = vscode.Uri.parse(resource);
      this.previewSecuritySelector.showSecuritySelectorForResource(
        source.query ? vscode.Uri.parse(source.query) : source
      );
    } else if (
      vscode.window.activeTextEditor &&
      isMarkdownFile(vscode.window.activeTextEditor.document)
    ) {
      this.previewSecuritySelector.showSecuritySelectorForResource(
        vscode.window.activeTextEditor.document.uri
      );
    }
  }
}

export class MoveCursorToPositionCommand implements Command {
  public readonly id = '_markdown.moveCursorToPosition';

  public execute(line: number, character: number) {
    if (!vscode.window.activeTextEditor) {
      return;
    }
    const position = new vscode.Position(line, character);
    const selection = new vscode.Selection(position, position);
    vscode.window.activeTextEditor.revealRange(selection);
    vscode.window.activeTextEditor.selection = selection;
  }
}

export class ToggleLockCommand implements Command {
  public readonly id = 'markdown.preview.toggleLock';

  public constructor(private readonly previewManager: MarkdownPreviewManager) {}

  public execute() {
    this.previewManager.toggleLock();
  }
}

export class RenderDocument implements Command {
  public readonly id = 'markdown.api.render';

  public constructor(private readonly engine: MarkdownEngine) {}

  public async execute(document: SkinnyTextDocument | string): Promise<string> {
    return this.engine.render(document);
  }
}
