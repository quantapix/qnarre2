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
import { LangServer, WorkspaceServiceInstance, getCapability } from './langServer';

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

export class PyServer extends LangServer {
  constructor(name = 'PyServer', rootDir: string) {
    super(name, rootDir);
  }

  protected _prepConn(cmds: string[]) {
    this._conn.onInitialize(
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
        this._conn.onShutdown(() => {
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
          getClientCapability(
            'textDocument.rangeFormatting.dynamicRegistration',
            false
          ) && typeof ps.initializationOptions.provideFormatter !== 'boolean';
        scopedSettingsSupport = getClientCapability('workspace.configuration', false);
        workspaceFoldersSupport = getClientCapability(
          'workspace.workspaceFolders',
          false
        );
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
          documentRangeFormattingProvider:
            ps.initializationOptions.provideFormatter === true,
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

    this._conn.onInitialized(() => {
      if (workspaceFoldersSupport) {
        con.client.register(DidChangeWorkspaceFoldersNotification.type);
        this._conn.onNotification(DidChangeWorkspaceFoldersNotification.type, (e) => {
          const toAdd = e.event.added;
          const toRemove = e.event.removed;
          const updatedFolders = [];
          if (workspaceFolders) {
            for (const f of workspaceFolders) {
              if (
                !toRemove.some((r) => r.uri === f.uri) &&
                !toAdd.some((r) => r.uri === f.uri)
              ) {
                updatedFolders.push(f);
              }
            }
          }
          workspaceFolders = updatedFolders.concat(toAdd);
          docs.all().forEach(triggerValidation);
        });
      }
    });

    this._conn.onDidChangeConfiguration((ps) => {
      globalSettings = ps.settings;
      documentSettings = {};
      docs.all().forEach(triggerValidation);
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
            formatterRegistration = con.client.register(
              DocumentRangeFormattingRequest.type,
              {
                documentSelector,
              }
            );
          }
        } else if (formatterRegistration) {
          formatterRegistration.then((r) => r.dispose());
          formatterRegistration = null;
        }
      }
    });

    this._conn.onCompletion(async (ps, token) => {
      return runSafeAsync(
        async () => {
          const d = docs.get(ps.textDocument.uri);
          if (!d) return null;
          const mode = languageModes.getModeAtPosition(d, ps.position);
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
          const ss = await getDocumentSettings(d, () => doComplete.length > 2);
          return doComplete(d, ps.position, ss);
        },
        null,
        `Error while computing completions for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onCompletionResolve((i, token) => {
      return runSafe(
        () => {
          const data = i.data;
          if (data && data.languageId && data.uri) {
            const mode = languageModes.getMode(data.languageId);
            const d = docs.get(data.uri);
            if (mode && mode.doResolve && d) {
              return mode.doResolve(d, i);
            }
          }
          return i;
        },
        i,
        `Error while resolving completion proposal`,
        token
      );
    });

    this._conn.onHover((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const m = languageModes.getModeAtPosition(d, ps.position);
            if (m && m.doHover) {
              return m.doHover(d, ps.position);
            }
          }
          return null;
        },
        null,
        `Error while computing hover for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onDocumentHighlight((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const m = languageModes.getModeAtPosition(d, ps.position);
            if (m && m.findDocumentHighlight) {
              return m.findDocumentHighlight(d, ps.position);
            }
          }
          return [];
        },
        [],
        `Error while computing document highlights for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onDefinition((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const m = languageModes.getModeAtPosition(d, ps.position);
            if (m && m.findDefinition) {
              return m.findDefinition(d, ps.position);
            }
          }
          return [];
        },
        null,
        `Error while computing definitions for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onReferences((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const m = languageModes.getModeAtPosition(d, ps.position);
            if (m && m.findReferences) {
              return m.findReferences(d, ps.position);
            }
          }
          return [];
        },
        [],
        `Error while computing references for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onSignatureHelp((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const m = languageModes.getModeAtPosition(d, ps.position);
            if (m && m.doSignatureHelp) {
              return m.doSignatureHelp(d, ps.position);
            }
          }
          return null;
        },
        null,
        `Error while computing signature help for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onDocumentRangeFormatting(async (ps, token) => {
      return runSafeAsync(
        async () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            let ss = await getDocumentSettings(d, () => true);
            if (!ss) ss = globalSettings;

            const unformattedTags: string =
              (ss && ss.html && ss.html.format && ss.html.format.unformatted) || '';
            const enabledModes = {
              css: !unformattedTags.match(/\bstyle\b/),
              javascript: !unformattedTags.match(/\bscript\b/),
            };
            return format(languageModes, d, ps.range, ps.options, ss, enabledModes);
          }
          return [];
        },
        [],
        `Error while formatting range for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onDocumentLinks((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          const links: DocumentLink[] = [];
          if (d) {
            const documentContext = getDocumentContext(d.uri, workspaceFolders);
            languageModes.getAllModesInDocument(d).forEach((m) => {
              if (m.findDocumentLinks) {
                pushAll(links, m.findDocumentLinks(d, documentContext));
              }
            });
          }
          return links;
        },
        [],
        `Error while document links for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onDocumentSymbol((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          const symbols: SymbolInformation[] = [];
          if (d) {
            languageModes.getAllModesInDocument(d).forEach((m) => {
              if (m.findDocumentSymbols) {
                pushAll(symbols, m.findDocumentSymbols(d));
              }
            });
          }
          return symbols;
        },
        [],
        `Error while computing document symbols for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onRequest(DocumentColorRequest.type, (ps, token) => {
      return runSafe(
        () => {
          const infos: ColorInformation[] = [];
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            languageModes.getAllModesInDocument(d).forEach((m) => {
              if (m.findDocumentColors) {
                pushAll(infos, m.findDocumentColors(d));
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

    this._conn.onRequest(ColorPresentationRequest.type, (ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const mode = languageModes.getModeAtPosition(d, ps.range.start);
            if (mode && mode.getColorPresentations) {
              return mode.getColorPresentations(d, ps.color, ps.range);
            }
          }
          return [];
        },
        [],
        `Error while computing color presentations for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onRequest(TagCloseRequest.type, (ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const pos = ps.position;
            if (pos.character > 0) {
              const mode = languageModes.getModeAtPosition(
                d,
                Position.create(pos.line, pos.character - 1)
              );
              if (mode && mode.doAutoClose) {
                return mode.doAutoClose(d, pos);
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

    this._conn.onFoldingRanges((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            return getFoldingRanges(languageModes, d, foldingRangeLimit, token);
          }
          return null;
        },
        null,
        `Error while computing folding regions for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onSelectionRanges((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            return getSelectionRanges(languageModes, d, ps.positions);
          }
          return [];
        },
        [],
        `Error while computing selection ranges for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onRenameRequest((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          const position: Position = ps.position;

          if (d) {
            const htmlMode = languageModes.getMode('html');
            if (htmlMode && htmlMode.doRename) {
              return htmlMode.doRename(d, position, ps.newName);
            }
          }
          return null;
        },
        null,
        `Error while computing rename for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onRequest(OnTypeRenameRequest.type, (ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const pos = ps.position;
            if (pos.character > 0) {
              const mode = languageModes.getModeAtPosition(
                d,
                Position.create(pos.line, pos.character - 1)
              );
              if (mode && mode.doOnTypeRename) {
                return mode.doOnTypeRename(d, pos);
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

    this._conn.onRequest(SemanticTokenRequest.type, (ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            return getSemanticTokenProvider().getSemanticTokens(d, ps.ranges);
          }
          return null;
        },
        null,
        `Error while computing semantic tokens for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onRequest(SemanticTokenLegendRequest.type, (_ps, token) => {
      return runSafe(
        () => {
          return getSemanticTokenProvider().legend;
        },
        null,
        `Error while computing semantic tokens legend`,
        token
      );
    });
  }
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

let formatterRegistration: Thenable<Disposable> | null = null;

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

function isValidationEnabled(languageId: string, ss: Settings = globalSettings) {
  const validationSettings = ss && ss.html && ss.html.validate;
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
      const ss = await getDocumentSettings(textDocument, () =>
        modes.some((m) => !!m.doValidation)
      );
      const latestTextDocument = docs.get(textDocument.uri);
      if (latestTextDocument && latestTextDocument.version === version) {
        // check no new version has come in after in after the async op
        modes.forEach((mode) => {
          if (mode.doValidation && isValidationEnabled(mode.getId(), ss)) {
            pushAll(diagnostics, mode.doValidation(latestTextDocument, ss));
          }
        });
        con.sendDiagnostics({ uri: latestTextDocument.uri, diagnostics });
      }
    }
  } catch (e) {
    con.console.error(formatError(`Error while validating ${textDocument.uri}`, e));
  }
}

let semanticTokensProvider: SemanticTokenProvider | undefined;
function getSemanticTokenProvider() {
  if (!semanticTokensProvider) {
    semanticTokensProvider = newSemanticTokenProvider(languageModes);
  }
  return semanticTokensProvider;
}
