/* eslint-disable @typescript-eslint/unbound-method */
import * as vsc from 'vscode';
import type * as proto from '../protocol';

import * as qc from '../utils/convert';
import * as qr from '../utils/registration';
import * as qs from '../service';
import * as qx from '../utils/extras';

class TagClosing extends qx.Disposable {
  public static readonly minApi = qr.API.default;

  private _disposed = false;
  private _timeout: NodeJS.Timer | undefined = undefined;
  private _cancel: vsc.CancellationTokenSource | undefined = undefined;

  constructor(private readonly client: qs.IServiceClient) {
    super();
    vsc.workspace.onDidChangeTextDocument(
      (event) => this.onDidChangeTextDocument(event.document, event.contentChanges),
      null,
      this.dispos
    );
  }

  public dispose() {
    super.dispose();
    this._disposed = true;

    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = undefined;
    }

    if (this._cancel) {
      this._cancel.cancel();
      this._cancel.dispose();
      this._cancel = undefined;
    }
  }

  private onDidChangeTextDocument(
    document: vsc.TextDocument,
    changes: readonly vsc.TextDocumentContentChangeEvent[]
  ) {
    const activeDocument =
      vsc.window.activeTextEditor && vsc.window.activeTextEditor.document;
    if (document !== activeDocument || changes.length === 0) return;
    const filepath = this.client.toOpenedPath(document);
    if (!filepath) return;
    if (typeof this._timeout !== 'undefined') clearTimeout(this._timeout);
    if (this._cancel) {
      this._cancel.cancel();
      this._cancel.dispose();
      this._cancel = undefined;
    }
    const lastChange = changes[changes.length - 1];
    const lastCharacter = lastChange.text[lastChange.text.length - 1];
    if (lastChange.rangeLength > 0 || (lastCharacter !== '>' && lastCharacter !== '/'))
      return;
    const priorCharacter =
      lastChange.range.start.character > 0
        ? document.getText(
            new vsc.Range(
              lastChange.range.start.translate({ characterDelta: -1 }),
              lastChange.range.start
            )
          )
        : '';
    if (priorCharacter === '>') return;
    const version = document.version;
    this._timeout = setTimeout(
      () => async () => {
        this._timeout = undefined;
        if (this._disposed) return;
        const addedLines = lastChange.text.split(/\r\n|\n/g);
        const position =
          addedLines.length <= 1
            ? lastChange.range.start.translate({ characterDelta: lastChange.text.length })
            : new vsc.Position(
                lastChange.range.start.line + addedLines.length - 1,
                addedLines[addedLines.length - 1].length
              );
        const args: proto.JsxClosingTagRequestArgs = qc.Position.toFileLocationRequestArgs(
          filepath,
          position
        );
        this._cancel = new vsc.CancellationTokenSource();
        const response = await this.client.execute(
          'jsxClosingTag',
          args,
          this._cancel.token
        );
        if (response.type !== 'response' || !response.body) return;
        if (this._disposed) return;
        const activeEditor = vsc.window.activeTextEditor;
        if (!activeEditor) return;
        const insertion = response.body;
        const activeDocument = activeEditor.document;
        if (document === activeDocument && activeDocument.version === version) {
          activeEditor.insertSnippet(
            this.getTagSnippet(insertion),
            this.getInsertionPositions(activeEditor, position)
          );
        }
      },
      100
    );
  }

  private getTagSnippet(closingTag: proto.TextInsertion): vsc.SnippetString {
    const snippet = new vsc.SnippetString();
    snippet.appendPlaceholder('', 0);
    snippet.appendText(closingTag.newText);
    return snippet;
  }

  private getInsertionPositions(editor: vsc.TextEditor, position: vsc.Position) {
    const activeSelectionPositions = editor.selections.map((s) => s.active);
    return activeSelectionPositions.some((p) => p.isEqual(position))
      ? activeSelectionPositions
      : position;
  }
}

export class ActiveDocumentDependentRegistration extends qx.Disposable {
  private readonly _registration: qr.Conditional;
  constructor(
    private readonly selector: vsc.DocumentSelector,
    register: () => vsc.Disposable
  ) {
    super();
    this._registration = this.register(new qr.Conditional(register));
    vsc.window.onDidChangeActiveTextEditor(this.update, this, this.dispos);
    vsc.workspace.onDidOpenTextDocument(this.onDidOpenDocument, this, this.dispos);
    this.update();
  }

  private update() {
    const editor = vsc.window.activeTextEditor;
    const enabled = !!(editor && vsc.languages.match(this.selector, editor.document));
    this._registration.update(enabled);
  }

  private onDidOpenDocument(openedDocument: vsc.TextDocument) {
    if (
      vsc.window.activeTextEditor &&
      vsc.window.activeTextEditor.document === openedDocument
    ) {
      this.update();
    }
  }
}

export function register(s: vsc.DocumentSelector, lang: string, c: qs.IServiceClient) {
  return new qr.VersionDependent(
    c,
    TagClosing.minApi,
    () =>
      new qr.ConfigDependent(
        lang,
        'autoClosingTags',
        () => new ActiveDocumentDependentRegistration(s, () => new TagClosing(c))
      )
  );
}
