import {
  createConnection,
  IConnection,
  TextDocuments,
  InitializeParams,
  InitializeResult,
  RequestType,
  DocumentRangeFormattingRequest,
  Disposable,
  DocumentSelector,
  TextDocumentPositionParams,
  ServerCapabilities,
  ConfigurationRequest,
  ConfigurationParams,
  DidChangeWorkspaceFoldersNotification,
  DocumentColorRequest,
  ColorPresentationRequest,
  TextDocumentSyncKind,
} from 'vscode-languageserver';
import {
  getLanguageModes,
  LanguageModes,
  Settings,
  TextDocument,
  Position,
  Diagnostic,
  WorkspaceFolder,
  ColorInformation,
  Range,
  DocumentLink,
  SymbolInformation,
  TextDocumentIdentifier,
} from '../src-html/modes/languageModes';

import { format } from '../src-html/modes/formatting';
import { pushAll } from '../src-html/utils/arrays';
import { getDocumentContext } from '../src-html/utils/documentContext';
import { URI } from 'vscode-uri';
import { formatError, runSafe, runSafeAsync } from '../src-html/utils/runner';

import { getFoldingRanges } from '../src-html/modes/htmlFolding';
import { getDataProviders } from './customData';
import { getSelectionRanges } from '../src-html/modes/selectionRanges';
import {
  SemanticTokenProvider,
  newSemanticTokenProvider,
} from '../src-html/modes/semanticTokens';

namespace TagCloseRequest {
  export const type: RequestType<
    TextDocumentPositionParams,
    string | null,
    any,
    any
  > = new RequestType('html/tag');
}
namespace OnTypeRenameRequest {
  export const type: RequestType<
    TextDocumentPositionParams,
    Range[] | null,
    any,
    any
  > = new RequestType('html/onTypeRename');
}

interface SemanticTokenParams {
  textDocument: TextDocumentIdentifier;
  ranges?: Range[];
}
namespace SemanticTokenRequest {
  export const type: RequestType<
    SemanticTokenParams,
    number[] | null,
    any,
    any
  > = new RequestType('html/semanticTokens');
}
namespace SemanticTokenLegendRequest {
  export const type: RequestType<
    void,
    { types: string[]; modifiers: string[] } | null,
    any,
    any
  > = new RequestType('html/semanticTokenLegend');
}

const con: IConnection = createConnection();

console.log = con.console.log.bind(con.console);
console.error = con.console.error.bind(con.console);

process.on('unhandledRejection', (e: any) => {
  console.error(formatError(`Unhandled exception`, e));
});
process.on('uncaughtException', (e: any) => {
  console.error(formatError(`Unhandled exception`, e));
});

const docs = new TextDocuments(TextDocument);
docs.listen(con);

let workspaceFolders: WorkspaceFolder[] = [];
let languageModes: LanguageModes;

let clientSnippetSupport = false;
let dynamicFormatterRegistration = false;
let scopedSettingsSupport = false;
let workspaceFoldersSupport = false;
let foldingRangeLimit = Number.MAX_VALUE;

let globalSettings: Settings = {};
let documentSettings: { [key: string]: Thenable<Settings> } = {};

docs.onDidClose((e) => {
  delete documentSettings[e.document.uri];
});

function getDocumentSettings(
  textDocument: TextDocument,
  needsDocumentSettings: () => boolean
): Thenable<Settings | undefined> {
  if (scopedSettingsSupport && needsDocumentSettings()) {
    let promise = documentSettings[textDocument.uri];
    if (!promise) {
      const scopeUri = textDocument.uri;
      const configRequestParam: ConfigurationParams = {
        items: [
          { scopeUri, section: 'css' },
          { scopeUri, section: 'html' },
          { scopeUri, section: 'javascript' },
        ],
      };
      promise = connection
        .sendRequest(ConfigurationRequest.type, configRequestParam)
        .then((s) => ({ css: s[0], html: s[1], javascript: s[2] }));
      documentSettings[textDocument.uri] = promise;
    }
    return promise;
  }
  return Promise.resolve(undefined);
}

con.onInitialize(
  (ps: InitializeParams): InitializeResult => {
    workspaceFolders = ps.workspaceFolders ?? [];
    if (!Array.isArray(workspaceFolders)) {
      workspaceFolders = [];
      if (ps.rootPath) {
        workspaceFolders.push({ name: '', uri: URI.file(ps.rootPath).toString() });
      }
    }
    const paths: string[] = ps.initializationOptions.dataPaths;
    const providers = getDataProviders(paths);

    const workspace = {
      get settings() {
        return globalSettings;
      },
      get folders() {
        return workspaceFolders;
      },
    };

    const initializationOptions = ps.initializationOptions;

    languageModes = getLanguageModes(
      initializationOptions
        ? initializationOptions.embeddedLanguages
        : { css: true, javascript: true },
      workspace,
      ps.capabilities,
      providers
    );

    docs.onDidClose((e) => {
      languageModes.onDocumentRemoved(e.document);
    });
    con.onShutdown(() => {
      languageModes.dispose();
    });

    function getClientCapability<T>(name: string, def: T) {
      const keys = name.split('.');
      let c: any = ps.capabilities;
      for (let i = 0; c && i < keys.length; i++) {
        if (!c.hasOwnProperty(keys[i])) {
          return def;
        }
        c = c[keys[i]];
      }
      return c;
    }

    clientSnippetSupport = getClientCapability(
      'textDocument.completion.completionItem.snippetSupport',
      false
    );
    dynamicFormatterRegistration =
      getClientCapability('textDocument.rangeFormatting.dynamicRegistration', false) &&
      typeof ps.initializationOptions.provideFormatter !== 'boolean';
    scopedSettingsSupport = getClientCapability('workspace.configuration', false);
    workspaceFoldersSupport = getClientCapability('workspace.workspaceFolders', false);
    foldingRangeLimit = getClientCapability(
      'textDocument.foldingRange.rangeLimit',
      Number.MAX_VALUE
    );
    const capabilities: ServerCapabilities = {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: clientSnippetSupport
        ? { resolveProvider: true, triggerCharacters: ['.', ':', '<', '"', '=', '/'] }
        : undefined,
      hoverProvider: true,
      documentHighlightProvider: true,
      documentRangeFormattingProvider: ps.initializationOptions.provideFormatter === true,
      documentLinkProvider: { resolveProvider: false },
      documentSymbolProvider: true,
      definitionProvider: true,
      signatureHelpProvider: { triggerCharacters: ['('] },
      referencesProvider: true,
      colorProvider: {},
      foldingRangeProvider: true,
      selectionRangeProvider: true,
      renameProvider: true,
    };
    return { capabilities };
  }
);

con.onInitialized(() => {
  if (workspaceFoldersSupport) {
    con.client.register(DidChangeWorkspaceFoldersNotification.type);

    con.onNotification(DidChangeWorkspaceFoldersNotification.type, (e) => {
      const toAdd = e.event.added;
      const toRemove = e.event.removed;
      const updatedFolders = [];
      if (workspaceFolders) {
        for (const folder of workspaceFolders) {
          if (
            !toRemove.some((r) => r.uri === folder.uri) &&
            !toAdd.some((r) => r.uri === folder.uri)
          ) {
            updatedFolders.push(folder);
          }
        }
      }
      workspaceFolders = updatedFolders.concat(toAdd);
      docs.all().forEach(triggerValidation);
    });
  }
});

let formatterRegistration: Thenable<Disposable> | null = null;

// The settings have changed. Is send on server activation as well.
con.onDidChangeConfiguration((change) => {
  globalSettings = change.settings;
  documentSettings = {}; // reset all document settings
  docs.all().forEach(triggerValidation);

  // dynamically enable & disable the formatter
  if (dynamicFormatterRegistration) {
    const enableFormatter =
      globalSettings &&
      globalSettings.html &&
      globalSettings.html.format &&
      globalSettings.html.format.enable;
    if (enableFormatter) {
      if (!formatterRegistration) {
        const documentSelector: DocumentSelector = [
          { language: 'html' },
          { language: 'handlebars' },
        ];
        formatterRegistration = con.client.register(DocumentRangeFormattingRequest.type, {
          documentSelector,
        });
      }
    } else if (formatterRegistration) {
      formatterRegistration.then((r) => r.dispose());
      formatterRegistration = null;
    }
  }
});

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

function isValidationEnabled(languageId: string, settings: Settings = globalSettings) {
  const validationSettings = settings && settings.html && settings.html.validate;
  if (validationSettings) {
    return (
      (languageId === 'css' && validationSettings.styles !== false) ||
      (languageId === 'javascript' && validationSettings.scripts !== false)
    );
  }
  return true;
}

async function validateTextDocument(textDocument: TextDocument) {
  try {
    const version = textDocument.version;
    const diagnostics: Diagnostic[] = [];
    if (textDocument.languageId === 'html') {
      const modes = languageModes.getAllModesInDocument(textDocument);
      const settings = await getDocumentSettings(textDocument, () =>
        modes.some((m) => !!m.doValidation)
      );
      const latestTextDocument = docs.get(textDocument.uri);
      if (latestTextDocument && latestTextDocument.version === version) {
        // check no new version has come in after in after the async op
        modes.forEach((mode) => {
          if (mode.doValidation && isValidationEnabled(mode.getId(), settings)) {
            pushAll(diagnostics, mode.doValidation(latestTextDocument, settings));
          }
        });
        con.sendDiagnostics({ uri: latestTextDocument.uri, diagnostics });
      }
    }
  } catch (e) {
    con.console.error(formatError(`Error while validating ${textDocument.uri}`, e));
  }
}

con.onCompletion(async (textDocumentPosition, token) => {
  return runSafeAsync(
    async () => {
      const document = docs.get(textDocumentPosition.textDocument.uri);
      if (!document) {
        return null;
      }
      const mode = languageModes.getModeAtPosition(
        document,
        textDocumentPosition.position
      );
      if (!mode || !mode.doComplete) {
        return { isIncomplete: true, items: [] };
      }
      const doComplete = mode.doComplete;

      if (mode.getId() !== 'html') {
        /* __GDPR__
				"html.embbedded.complete" : {
					"languageId" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
				}
			 */
        con.telemetry.logEvent({
          key: 'html.embbedded.complete',
          value: { languageId: mode.getId() },
        });
      }

      const settings = await getDocumentSettings(document, () => doComplete.length > 2);
      const result = doComplete(document, textDocumentPosition.position, settings);
      return result;
    },
    null,
    `Error while computing completions for ${textDocumentPosition.textDocument.uri}`,
    token
  );
});

con.onCompletionResolve((item, token) => {
  return runSafe(
    () => {
      const data = item.data;
      if (data && data.languageId && data.uri) {
        const mode = languageModes.getMode(data.languageId);
        const document = docs.get(data.uri);
        if (mode && mode.doResolve && document) {
          return mode.doResolve(document, item);
        }
      }
      return item;
    },
    item,
    `Error while resolving completion proposal`,
    token
  );
});

con.onHover((textDocumentPosition, token) => {
  return runSafe(
    () => {
      const document = docs.get(textDocumentPosition.textDocument.uri);
      if (document) {
        const mode = languageModes.getModeAtPosition(
          document,
          textDocumentPosition.position
        );
        if (mode && mode.doHover) {
          return mode.doHover(document, textDocumentPosition.position);
        }
      }
      return null;
    },
    null,
    `Error while computing hover for ${textDocumentPosition.textDocument.uri}`,
    token
  );
});

con.onDocumentHighlight((documentHighlightParams, token) => {
  return runSafe(
    () => {
      const document = docs.get(documentHighlightParams.textDocument.uri);
      if (document) {
        const mode = languageModes.getModeAtPosition(
          document,
          documentHighlightParams.position
        );
        if (mode && mode.findDocumentHighlight) {
          return mode.findDocumentHighlight(document, documentHighlightParams.position);
        }
      }
      return [];
    },
    [],
    `Error while computing document highlights for ${documentHighlightParams.textDocument.uri}`,
    token
  );
});

con.onDefinition((definitionParams, token) => {
  return runSafe(
    () => {
      const document = docs.get(definitionParams.textDocument.uri);
      if (document) {
        const mode = languageModes.getModeAtPosition(document, definitionParams.position);
        if (mode && mode.findDefinition) {
          return mode.findDefinition(document, definitionParams.position);
        }
      }
      return [];
    },
    null,
    `Error while computing definitions for ${definitionParams.textDocument.uri}`,
    token
  );
});

con.onReferences((referenceParams, token) => {
  return runSafe(
    () => {
      const document = docs.get(referenceParams.textDocument.uri);
      if (document) {
        const mode = languageModes.getModeAtPosition(document, referenceParams.position);
        if (mode && mode.findReferences) {
          return mode.findReferences(document, referenceParams.position);
        }
      }
      return [];
    },
    [],
    `Error while computing references for ${referenceParams.textDocument.uri}`,
    token
  );
});

con.onSignatureHelp((signatureHelpParms, token) => {
  return runSafe(
    () => {
      const document = docs.get(signatureHelpParms.textDocument.uri);
      if (document) {
        const mode = languageModes.getModeAtPosition(
          document,
          signatureHelpParms.position
        );
        if (mode && mode.doSignatureHelp) {
          return mode.doSignatureHelp(document, signatureHelpParms.position);
        }
      }
      return null;
    },
    null,
    `Error while computing signature help for ${signatureHelpParms.textDocument.uri}`,
    token
  );
});

con.onDocumentRangeFormatting(async (formatParams, token) => {
  return runSafeAsync(
    async () => {
      const document = docs.get(formatParams.textDocument.uri);
      if (document) {
        let settings = await getDocumentSettings(document, () => true);
        if (!settings) {
          settings = globalSettings;
        }
        const unformattedTags: string =
          (settings &&
            settings.html &&
            settings.html.format &&
            settings.html.format.unformatted) ||
          '';
        const enabledModes = {
          css: !unformattedTags.match(/\bstyle\b/),
          javascript: !unformattedTags.match(/\bscript\b/),
        };

        return format(
          languageModes,
          document,
          formatParams.range,
          formatParams.options,
          settings,
          enabledModes
        );
      }
      return [];
    },
    [],
    `Error while formatting range for ${formatParams.textDocument.uri}`,
    token
  );
});

con.onDocumentLinks((documentLinkParam, token) => {
  return runSafe(
    () => {
      const document = docs.get(documentLinkParam.textDocument.uri);
      const links: DocumentLink[] = [];
      if (document) {
        const documentContext = getDocumentContext(document.uri, workspaceFolders);
        languageModes.getAllModesInDocument(document).forEach((m) => {
          if (m.findDocumentLinks) {
            pushAll(links, m.findDocumentLinks(document, documentContext));
          }
        });
      }
      return links;
    },
    [],
    `Error while document links for ${documentLinkParam.textDocument.uri}`,
    token
  );
});

con.onDocumentSymbol((documentSymbolParms, token) => {
  return runSafe(
    () => {
      const document = docs.get(documentSymbolParms.textDocument.uri);
      const symbols: SymbolInformation[] = [];
      if (document) {
        languageModes.getAllModesInDocument(document).forEach((m) => {
          if (m.findDocumentSymbols) {
            pushAll(symbols, m.findDocumentSymbols(document));
          }
        });
      }
      return symbols;
    },
    [],
    `Error while computing document symbols for ${documentSymbolParms.textDocument.uri}`,
    token
  );
});

con.onRequest(DocumentColorRequest.type, (ps, token) => {
  return runSafe(
    () => {
      const infos: ColorInformation[] = [];
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        languageModes.getAllModesInDocument(document).forEach((m) => {
          if (m.findDocumentColors) {
            pushAll(infos, m.findDocumentColors(document));
          }
        });
      }
      return infos;
    },
    [],
    `Error while computing document colors for ${ps.textDocument.uri}`,
    token
  );
});

con.onRequest(ColorPresentationRequest.type, (ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        const mode = languageModes.getModeAtPosition(document, ps.range.start);
        if (mode && mode.getColorPresentations) {
          return mode.getColorPresentations(document, ps.color, ps.range);
        }
      }
      return [];
    },
    [],
    `Error while computing color presentations for ${ps.textDocument.uri}`,
    token
  );
});

con.onRequest(TagCloseRequest.type, (ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        const pos = ps.position;
        if (pos.character > 0) {
          const mode = languageModes.getModeAtPosition(
            document,
            Position.create(pos.line, pos.character - 1)
          );
          if (mode && mode.doAutoClose) {
            return mode.doAutoClose(document, pos);
          }
        }
      }
      return null;
    },
    null,
    `Error while computing tag close actions for ${ps.textDocument.uri}`,
    token
  );
});

con.onFoldingRanges((ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        return getFoldingRanges(languageModes, document, foldingRangeLimit, token);
      }
      return null;
    },
    null,
    `Error while computing folding regions for ${ps.textDocument.uri}`,
    token
  );
});

con.onSelectionRanges((ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        return getSelectionRanges(languageModes, document, ps.positions);
      }
      return [];
    },
    [],
    `Error while computing selection ranges for ${ps.textDocument.uri}`,
    token
  );
});

con.onRenameRequest((ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      const position: Position = ps.position;

      if (document) {
        const htmlMode = languageModes.getMode('html');
        if (htmlMode && htmlMode.doRename) {
          return htmlMode.doRename(document, position, ps.newName);
        }
      }
      return null;
    },
    null,
    `Error while computing rename for ${ps.textDocument.uri}`,
    token
  );
});

con.onRequest(OnTypeRenameRequest.type, (ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        const pos = ps.position;
        if (pos.character > 0) {
          const mode = languageModes.getModeAtPosition(
            document,
            Position.create(pos.line, pos.character - 1)
          );
          if (mode && mode.doOnTypeRename) {
            return mode.doOnTypeRename(document, pos);
          }
        }
      }
      return null;
    },
    null,
    `Error while computing synced regions for ${ps.textDocument.uri}`,
    token
  );
});

let semanticTokensProvider: SemanticTokenProvider | undefined;
function getSemanticTokenProvider() {
  if (!semanticTokensProvider) {
    semanticTokensProvider = newSemanticTokenProvider(languageModes);
  }
  return semanticTokensProvider;
}

con.onRequest(SemanticTokenRequest.type, (ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        return getSemanticTokenProvider().getSemanticTokens(document, ps.ranges);
      }
      return null;
    },
    null,
    `Error while computing semantic tokens for ${ps.textDocument.uri}`,
    token
  );
});

con.onRequest(SemanticTokenLegendRequest.type, (_ps, token) => {
  return runSafe(
    () => {
      return getSemanticTokenProvider().legend;
    },
    null,
    `Error while computing semantic tokens legend`,
    token
  );
});

// Listen on the connection
con.listen();
