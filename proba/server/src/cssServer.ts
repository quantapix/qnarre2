import {
  CancellationToken,
  CodeActionParams,
  ColorPresentationParams,
  CompletionParams,
  ConfigurationRequest,
  DefinitionParams,
  DidChangeConfigurationParams,
  DocumentColorParams,
  DocumentHighlightParams,
  DocumentLinkParams,
  DocumentSymbolParams,
  FoldingRangeParams,
  HoverParams,
  InitializeParams,
  ReferenceParams,
  RenameParams,
  SelectionRangeParams,
  ServerCapabilities,
  TextDocuments,
  TextDocumentSyncKind,
  TextDocumentChangeEvent,
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { stat as fsStat } from 'fs';
import {
  getCSSLanguageService,
  getSCSSLanguageService,
  getLESSLanguageService,
  LanguageSettings,
  LanguageService,
  Stylesheet,
  FileSystemProvider,
  FileType,
  TextDocument,
  CompletionList,
} from 'vscode-css-languageservice';
import { getLanguageModelCache } from './cssModelCache';
import { getPathCompletionParticipant } from './pathCompletion';
import { formatError, runSafe, runSafeAsync } from '../src-css/utils/runner';
import { getDocumentContext } from '../src-css/utils/documentContext';
import { getDataProviders } from './cssData';

export interface Settings {
  css: LanguageSettings;
  less: LanguageSettings;
  scss: LanguageSettings;
}

import { LangServer } from './langServer';

export class CssServer extends LangServer {
  constructor(name = 'CssServer', rootDir: string) {
    super(name, rootDir);
  }

  protected initialize(ps: InitializeParams) {
    super.initialize(ps);
    workspaceFolders = ps.workspaceFolders ?? [];
    if (!Array.isArray(workspaceFolders)) {
      workspaceFolders = [];
      if (ps.rootPath) {
        workspaceFolders.push({ name: '', uri: URI.file(ps.rootPath).toString() });
      }
    }
    const paths: string[] = ps.initializationOptions.dataPaths || [];
    const customDataProviders = getDataProviders(paths);

    languageServices.css = getCSSLanguageService({
      customDataProviders,
      fileSystemProvider,
      clientCapabilities: ps.capabilities,
    });
    languageServices.scss = getSCSSLanguageService({
      customDataProviders,
      fileSystemProvider,
      clientCapabilities: ps.capabilities,
    });
    languageServices.less = getLESSLanguageService({
      customDataProviders,
      fileSystemProvider,
      clientCapabilities: ps.capabilities,
    });

    const capabilities: ServerCapabilities = {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: this._hasSnippets
        ? { resolveProvider: false, triggerCharacters: ['/', '-'] }
        : undefined,
      hoverProvider: true,
      documentSymbolProvider: true,
      referencesProvider: true,
      definitionProvider: true,
      documentHighlightProvider: true,
      documentLinkProvider: { resolveProvider: false },
      codeActionProvider: true,
      renameProvider: true,
      colorProvider: {},
      foldingRangeProvider: true,
      selectionRangeProvider: true,
    };
    return { capabilities };
  }

  protected didChangeConfiguration(ps: DidChangeConfigurationParams) {
    updateConfiguration(ps.settings as Settings);
  }

  protected completion(ps: CompletionParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (!d) return null;
        const cssLS = getLanguageService(d);
        const cl: CompletionList = {
          isIncomplete: false,
          items: [],
        };
        cssLS.setCompletionParticipants([
          getPathCompletionParticipant(d, workspaceFolders, cl),
        ]);
        const r = cssLS.doComplete(d, ps.position, stylesheets.get(d));
        return {
          isIncomplete: cl.isIncomplete,
          items: [...cl.items, ...r.items],
        };
      },
      null,
      `Error while computing completions for ${ps.textDocument.uri}`,
      token
    );
  }

  protected hover(ps: HoverParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          const s = stylesheets.get(d);
          return getLanguageService(d).doHover(d, ps.position, s);
        }
        return null;
      },
      null,
      `Error while computing hover for ${ps.textDocument.uri}`,
      token
    );
  }

  protected documentSymbol(ps: DocumentSymbolParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          const s = stylesheets.get(d);
          return getLanguageService(d).findDocumentSymbols(d, s);
        }
        return [];
      },
      [],
      `Error while computing document symbols for ${ps.textDocument.uri}`,
      token
    );
  }

  protected definition(ps: DefinitionParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          const s = stylesheets.get(d);
          return getLanguageService(d).findDefinition(d, ps.position, s);
        }
        return null;
      },
      null,
      `Error while computing definitions for ${ps.textDocument.uri}`,
      token
    );
  }

  protected documentHighlight(ps: DocumentHighlightParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          const s = stylesheets.get(d);
          return getLanguageService(d).findDocumentHighlights(d, ps.position, s);
        }
        return [];
      },
      [],
      `Error while computing document highlights for ${ps.textDocument.uri}`,
      token
    );
  }

  protected async documentLinks(ps: DocumentLinkParams, token: CancellationToken) {
    return runSafeAsync(
      async () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          const c = getDocumentContext(d.uri, workspaceFolders);
          const s = stylesheets.get(d);
          return await getLanguageService(d).findDocumentLinks2(d, s, c);
        }
        return [];
      },
      [],
      `Error while computing document links for ${ps.textDocument.uri}`,
      token
    );
  }

  protected references(ps: ReferenceParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          const s = stylesheets.get(d);
          return getLanguageService(d).findReferences(d, ps.position, s);
        }
        return [];
      },
      [],
      `Error while computing references for ${ps.textDocument.uri}`,
      token
    );
  }

  protected codeAction(ps: CodeActionParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          const s = stylesheets.get(d);
          return getLanguageService(d).doCodeActions(d, ps.range, ps.context, s);
        }
        return [];
      },
      [],
      `Error while computing code actions for ${ps.textDocument.uri}`,
      token
    );
  }

  protected documentColor(ps: DocumentColorParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          const s = stylesheets.get(d);
          return getLanguageService(d).findDocumentColors(d, s);
        }
        return [];
      },
      [],
      `Error while computing document colors for ${ps.textDocument.uri}`,
      token
    );
  }

  protected colorPresentation(ps: ColorPresentationParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          const s = stylesheets.get(d);
          return getLanguageService(d).getColorPresentations(d, s, ps.color, ps.range);
        }
        return [];
      },
      [],
      `Error while computing color presentations for ${ps.textDocument.uri}`,
      token
    );
  }

  protected renameRequest(ps: RenameParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          const s = stylesheets.get(d);
          return getLanguageService(d).doRename(d, ps.position, ps.newName, s);
        }
        return null;
      },
      null,
      `Error while computing renames for ${ps.textDocument.uri}`,
      token
    );
  }

  protected foldingRanges(ps: FoldingRangeParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          return getLanguageService(d).getFoldingRanges(d, {
            rangeLimit: this._hasFoldLimit,
          });
        }
        return null;
      },
      null,
      `Error while computing folding ranges for ${ps.textDocument.uri}`,
      token
    );
  }

  protected selectionRanges(ps: SelectionRangeParams, token: CancellationToken) {
    return runSafe(
      () => {
        const d = docs.get(ps.textDocument.uri);
        if (d) {
          const s = stylesheets.get(d);
          return getLanguageService(d).getSelectionRanges(d, ps.positions, s);
        }
        return [];
      },
      [],
      `Error while computing selection ranges for ${ps.textDocument.uri}`,
      token
    );
  }

  protected shutdown() {
    stylesheets.dispose();
  }
}

const docs = new TextDocuments(TextDocument);
docs.listen(con);

const stylesheets = getLanguageModelCache<Stylesheet>(10, 60, (document) =>
  getLanguageService(document).parseStylesheet(document)
);
docs.onDidClose((e: TextDocumentChangeEvent<TextDocument>) => {
  stylesheets.onDocumentRemoved(e.document);
});

const languageServices: { [id: string]: LanguageService } = {};

const fileSystemProvider: FileSystemProvider = {
  stat(documentUri: string) {
    const filePath = URI.parse(documentUri).fsPath;

    return new Promise((c, e) => {
      fsStat(filePath, (err, stats) => {
        if (err) {
          if (err.code === 'ENOENT') {
            return c({
              type: FileType.Unknown,
              ctime: -1,
              mtime: -1,
              size: -1,
            });
          } else {
            return e(err);
          }
        }

        let type = FileType.Unknown;
        if (stats.isFile()) {
          type = FileType.File;
        } else if (stats.isDirectory()) {
          type = FileType.Directory;
        } else if (stats.isSymbolicLink()) {
          type = FileType.SymbolicLink;
        }

        c({
          type,
          ctime: stats.ctime.getTime(),
          mtime: stats.mtime.getTime(),
          size: stats.size,
        });
      });
    });
  },
};

function getLanguageService(document: TextDocument) {
  let service = languageServices[document.languageId];
  if (!service) {
    con.console.log('Document type is ' + document.languageId + ', using css instead.');
    service = languageServices['css'];
  }
  return service;
}

let documentSettings: { [key: string]: Thenable<LanguageSettings | undefined> } = {};
docs.onDidClose((e: TextDocumentChangeEvent<TextDocument>) => {
  delete documentSettings[e.document.uri];
});

function getDocumentSettings(d: TextDocument): Thenable<LanguageSettings | undefined> {
  if (this._hasConfig) {
    let promise = documentSettings[d.uri];
    if (!promise) {
      const configRequestParam = {
        items: [{ scopeUri: d.uri, section: d.languageId }],
      };
      promise = connection
        .sendRequest(ConfigurationRequest.type, configRequestParam)
        .then((s) => s[0]);
      documentSettings[d.uri] = promise;
    }
    return promise;
  }
  return Promise.resolve(undefined);
}

function updateConfiguration(settings: Settings) {
  for (const languageId in languageServices) {
    languageServices[languageId].configure((settings as any)[languageId]);
  }
  // reset all document settings
  documentSettings = {};
  // Revalidate any open text documents
  docs.all().forEach(triggerValidation);
}

const pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {};
const validationDelayMs = 500;

docs.onDidChangeContent((change: TextDocumentChangeEvent<TextDocument>) => {
  triggerValidation(change.document);
});

docs.onDidClose((event: TextDocumentChangeEvent<TextDocument>) => {
  cleanPendingValidation(event.document);
  con.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

function cleanPendingValidation(d: TextDocument) {
  const r = pendingValidationRequests[d.uri];
  if (r) {
    clearTimeout(r);
    delete pendingValidationRequests[d.uri];
  }
}

function triggerValidation(d: TextDocument) {
  cleanPendingValidation(d);
  pendingValidationRequests[d.uri] = setTimeout(() => {
    delete pendingValidationRequests[d.uri];
    validateTextDocument(d);
  }, validationDelayMs);
}

function validateTextDocument(d: TextDocument) {
  const p = getDocumentSettings(d);
  p.then(
    (ss) => {
      const s = stylesheets.get(d);
      const ds = getLanguageService(d).doValidation(d, s, ss);
      con.sendDiagnostics({ uri: d.uri, ds });
    },
    (e) => {
      con.console.error(formatError(`Error while validating ${d.uri}`, e));
    }
  );
}
