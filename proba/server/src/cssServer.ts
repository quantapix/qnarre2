import {
  createConnection,
  IConnection,
  TextDocuments,
  InitializeParams,
  InitializeResult,
  ServerCapabilities,
  ConfigurationRequest,
  WorkspaceFolder,
  TextDocumentSyncKind,
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
  Position,
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

const con: IConnection = createConnection();

console.log = con.console.log.bind(con.console);
console.error = con.console.error.bind(con.console);

process.on('unhandledRejection', (e: any) => {
  con.console.error(formatError(`Unhandled exception`, e));
});

const docs = new TextDocuments(TextDocument);
docs.listen(con);

const stylesheets = getLanguageModelCache<Stylesheet>(10, 60, (document) =>
  getLanguageService(document).parseStylesheet(document)
);
docs.onDidClose((e) => {
  stylesheets.onDocumentRemoved(e.document);
});
con.onShutdown(() => {
  stylesheets.dispose();
});

let scopedSettingsSupport = false;
let foldingRangeLimit = Number.MAX_VALUE;
let workspaceFolders: WorkspaceFolder[];

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

con.onInitialize(
  (ps: InitializeParams): InitializeResult => {
    workspaceFolders = ps.workspaceFolders ?? [];
    if (!Array.isArray(workspaceFolders)) {
      workspaceFolders = [];
      if (ps.rootPath) {
        workspaceFolders.push({ name: '', uri: URI.file(ps.rootPath).toString() });
      }
    }
    const paths: string[] = ps.initializationOptions.dataPaths || [];
    const customDataProviders = getDataProviders(paths);

    function getClientCapability<T>(name: string, def: T) {
      const keys = name.split('.');
      let c: any = ps.capabilities;
      for (let i = 0; c && i < keys.length; i++) {
        if (!c.hasOwnProperty(keys[i])) return def;
        c = c[keys[i]];
      }
      return c;
    }
    const snippets = !!getClientCapability(
      'textDocument.completion.completionItem.snippetSupport',
      false
    );
    scopedSettingsSupport = !!getClientCapability('workspace.configuration', false);
    foldingRangeLimit = getClientCapability(
      'textDocument.foldingRange.rangeLimit',
      Number.MAX_VALUE
    );

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
      completionProvider: snippets
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
);

function getLanguageService(document: TextDocument) {
  let service = languageServices[document.languageId];
  if (!service) {
    con.console.log('Document type is ' + document.languageId + ', using css instead.');
    service = languageServices['css'];
  }
  return service;
}

let documentSettings: { [key: string]: Thenable<LanguageSettings | undefined> } = {};
// remove document settings on close
docs.onDidClose((e) => {
  delete documentSettings[e.document.uri];
});
function getDocumentSettings(
  textDocument: TextDocument
): Thenable<LanguageSettings | undefined> {
  if (scopedSettingsSupport) {
    let promise = documentSettings[textDocument.uri];
    if (!promise) {
      const configRequestParam = {
        items: [{ scopeUri: textDocument.uri, section: textDocument.languageId }],
      };
      promise = connection
        .sendRequest(ConfigurationRequest.type, configRequestParam)
        .then((s) => s[0]);
      documentSettings[textDocument.uri] = promise;
    }
    return promise;
  }
  return Promise.resolve(undefined);
}

// The settings have changed. Is send on server activation as well.
con.onDidChangeConfiguration((change) => {
  updateConfiguration(<Settings>change.settings);
});

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

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
docs.onDidChangeContent((change) => {
  triggerValidation(change.document);
});

// a document has closed: clear all diagnostics
docs.onDidClose((event) => {
  cleanPendingValidation(event.document);
  con.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

function cleanPendingValidation(textDocument: TextDocument): void {
  const request = pendingValidationRequests[textDocument.uri];
  if (request) {
    clearTimeout(request);
    delete pendingValidationRequests[textDocument.uri];
  }
}

function triggerValidation(textDocument: TextDocument): void {
  cleanPendingValidation(textDocument);
  pendingValidationRequests[textDocument.uri] = setTimeout(() => {
    delete pendingValidationRequests[textDocument.uri];
    validateTextDocument(textDocument);
  }, validationDelayMs);
}

function validateTextDocument(textDocument: TextDocument): void {
  const settingsPromise = getDocumentSettings(textDocument);
  settingsPromise.then(
    (settings) => {
      const stylesheet = stylesheets.get(textDocument);
      const diagnostics = getLanguageService(textDocument).doValidation(
        textDocument,
        stylesheet,
        settings
      );
      // Send the computed diagnostics to VSCode.
      con.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    },
    (e) => {
      con.console.error(formatError(`Error while validating ${textDocument.uri}`, e));
    }
  );
}

con.onCompletion((textDocumentPosition, token) => {
  return runSafe(
    () => {
      const document = docs.get(textDocumentPosition.textDocument.uri);
      if (!document) {
        return null;
      }
      const cssLS = getLanguageService(document);
      const pathCompletionList: CompletionList = {
        isIncomplete: false,
        items: [],
      };
      cssLS.setCompletionParticipants([
        getPathCompletionParticipant(document, workspaceFolders, pathCompletionList),
      ]);
      const result = cssLS.doComplete(
        document,
        textDocumentPosition.position,
        stylesheets.get(document)
      );
      return {
        isIncomplete: pathCompletionList.isIncomplete,
        items: [...pathCompletionList.items, ...result.items],
      };
    },
    null,
    `Error while computing completions for ${textDocumentPosition.textDocument.uri}`,
    token
  );
});

con.onHover((textDocumentPosition, token) => {
  return runSafe(
    () => {
      const document = docs.get(textDocumentPosition.textDocument.uri);
      if (document) {
        const styleSheet = stylesheets.get(document);
        return getLanguageService(document).doHover(
          document,
          textDocumentPosition.position,
          styleSheet
        );
      }
      return null;
    },
    null,
    `Error while computing hover for ${textDocumentPosition.textDocument.uri}`,
    token
  );
});

con.onDocumentSymbol((documentSymbolParams, token) => {
  return runSafe(
    () => {
      const document = docs.get(documentSymbolParams.textDocument.uri);
      if (document) {
        const stylesheet = stylesheets.get(document);
        return getLanguageService(document).findDocumentSymbols(document, stylesheet);
      }
      return [];
    },
    [],
    `Error while computing document symbols for ${documentSymbolParams.textDocument.uri}`,
    token
  );
});

con.onDefinition((documentDefinitionParams, token) => {
  return runSafe(
    () => {
      const document = docs.get(documentDefinitionParams.textDocument.uri);
      if (document) {
        const stylesheet = stylesheets.get(document);
        return getLanguageService(document).findDefinition(
          document,
          documentDefinitionParams.position,
          stylesheet
        );
      }
      return null;
    },
    null,
    `Error while computing definitions for ${documentDefinitionParams.textDocument.uri}`,
    token
  );
});

con.onDocumentHighlight((documentHighlightParams, token) => {
  return runSafe(
    () => {
      const document = docs.get(documentHighlightParams.textDocument.uri);
      if (document) {
        const stylesheet = stylesheets.get(document);
        return getLanguageService(document).findDocumentHighlights(
          document,
          documentHighlightParams.position,
          stylesheet
        );
      }
      return [];
    },
    [],
    `Error while computing document highlights for ${documentHighlightParams.textDocument.uri}`,
    token
  );
});

con.onDocumentLinks(async (documentLinkParams, token) => {
  return runSafeAsync(
    async () => {
      const document = docs.get(documentLinkParams.textDocument.uri);
      if (document) {
        const documentContext = getDocumentContext(document.uri, workspaceFolders);
        const stylesheet = stylesheets.get(document);
        return await getLanguageService(document).findDocumentLinks2(
          document,
          stylesheet,
          documentContext
        );
      }
      return [];
    },
    [],
    `Error while computing document links for ${documentLinkParams.textDocument.uri}`,
    token
  );
});

con.onReferences((referenceParams, token) => {
  return runSafe(
    () => {
      const document = docs.get(referenceParams.textDocument.uri);
      if (document) {
        const stylesheet = stylesheets.get(document);
        return getLanguageService(document).findReferences(
          document,
          referenceParams.position,
          stylesheet
        );
      }
      return [];
    },
    [],
    `Error while computing references for ${referenceParams.textDocument.uri}`,
    token
  );
});

con.onCodeAction((codeActionParams, token) => {
  return runSafe(
    () => {
      const document = docs.get(codeActionParams.textDocument.uri);
      if (document) {
        const stylesheet = stylesheets.get(document);
        return getLanguageService(document).doCodeActions(
          document,
          codeActionParams.range,
          codeActionParams.context,
          stylesheet
        );
      }
      return [];
    },
    [],
    `Error while computing code actions for ${codeActionParams.textDocument.uri}`,
    token
  );
});

con.onDocumentColor((ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        const stylesheet = stylesheets.get(document);
        return getLanguageService(document).findDocumentColors(document, stylesheet);
      }
      return [];
    },
    [],
    `Error while computing document colors for ${ps.textDocument.uri}`,
    token
  );
});

con.onColorPresentation((ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        const stylesheet = stylesheets.get(document);
        return getLanguageService(document).getColorPresentations(
          document,
          stylesheet,
          ps.color,
          ps.range
        );
      }
      return [];
    },
    [],
    `Error while computing color presentations for ${ps.textDocument.uri}`,
    token
  );
});

con.onRenameRequest((renameParameters, token) => {
  return runSafe(
    () => {
      const document = docs.get(renameParameters.textDocument.uri);
      if (document) {
        const stylesheet = stylesheets.get(document);
        return getLanguageService(document).doRename(
          document,
          renameParameters.position,
          renameParameters.newName,
          stylesheet
        );
      }
      return null;
    },
    null,
    `Error while computing renames for ${renameParameters.textDocument.uri}`,
    token
  );
});

con.onFoldingRanges((ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        return getLanguageService(document).getFoldingRanges(document, {
          rangeLimit: foldingRangeLimit,
        });
      }
      return null;
    },
    null,
    `Error while computing folding ranges for ${ps.textDocument.uri}`,
    token
  );
});

con.onSelectionRanges((ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      const positions: Position[] = ps.positions;

      if (document) {
        const stylesheet = stylesheets.get(document);
        return getLanguageService(document).getSelectionRanges(
          document,
          positions,
          stylesheet
        );
      }
      return [];
    },
    [],
    `Error while computing selection ranges for ${ps.textDocument.uri}`,
    token
  );
});

// Listen on the connection
con.listen();
