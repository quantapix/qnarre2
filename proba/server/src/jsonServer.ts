import {
  createConnection,
  IConnection,
  TextDocuments,
  InitializeParams,
  InitializeResult,
  NotificationType,
  RequestType,
  DocumentRangeFormattingRequest,
  Disposable,
  ServerCapabilities,
  TextDocumentSyncKind,
  TextEdit,
  DidChangeConfigurationParams,
} from 'vscode-languageserver';

import {
  xhr,
  XHRResponse,
  configure as configureHttpRequests,
  getErrorStatusDescription,
} from 'request-light';
import * as fs from 'fs';
import { URI } from 'vscode-uri';
import * as URL from 'url';
import { posix } from 'path';
import { setTimeout, clearTimeout } from 'timers';
import { formatError, runSafe, runSafeAsync } from './utils/runner';
import {
  TextDocument,
  JSONDocument,
  JSONSchema,
  getLanguageService,
  DocumentLanguageSettings,
  SchemaConfiguration,
  ClientCapabilities,
  SchemaRequestService,
  Diagnostic,
  Range,
  Position,
} from 'vscode-json-languageservice';
import { getLanguageModelCache } from './jsonModelCache';
import { LangServer, getCapability } from './langServer';

export class JsonServer extends LangServer {
  constructor(name = 'JsonServer', rootDir: string) {
    super(name, rootDir);
  }

  protected initialize(ps: InitializeParams) {
    super.initialize(ps);

    const handledProtocols = ps.initializationOptions?.handledSchemaProtocols;

    languageService = getLanguageService({
      schemaRequestService: getSchemaRequestService(handledProtocols),
      workspaceContext,
      contributions: [],
      clientCapabilities: ps.capabilities,
    });

    formatterMaxNumberOfEdits =
      ps.initializationOptions?.customCapabilities?.rangeFormatting?.editLimit ||
      Number.MAX_VALUE;
    const capabilities: ServerCapabilities = {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: this._hasSnippets
        ? {
            resolveProvider: false, // turn off resolving as the current language service doesn't do anything on resolve. Also fixes #91747
            triggerCharacters: ['"', ':'],
          }
        : undefined,
      hoverProvider: true,
      documentSymbolProvider: true,
      documentRangeFormattingProvider: ps.initializationOptions.provideFormatter === true,
      colorProvider: {},
      foldingRangeProvider: true,
      selectionRangeProvider: true,
      definitionProvider: true,
    };
    return { capabilities };
  }

  protected _prepConn(cmds: string[]) {
    this._conn.onInitialize(this.initialize.bind(this));

    this._conn.onDidChangeConfiguration((ps) => {
      const ss = ps.settings as Settings;
      configureHttpRequests(ss.http && ss.http.proxy, ss.http && ss.http.proxyStrictSSL);
      jsonConfigurationSettings = ss.json && ss.json.schemas;
      updateConfiguration();
      this._hasFoldLimit = Math.trunc(
        Math.max((ss.json && ss.json.resultLimit) || this._hasFoldLimit, 0)
      );
      resultLimit = Math.trunc(
        Math.max((ss.json && ss.json.resultLimit) || Number.MAX_VALUE, 0)
      );
      if (this._hasDynRegistry) {
        const f = ss && ss.json && ss.json.format && ss.json.format.enable;
        if (f) {
          if (!formatterRegistration) {
            formatterRegistration = this._conn.client.register(
              DocumentRangeFormattingRequest.type,
              { documentSelector: [{ language: 'json' }, { language: 'jsonc' }] }
            );
          }
        } else if (formatterRegistration) {
          formatterRegistration.then((r) => r.dispose());
          formatterRegistration = null;
        }
      }
    });

    this._conn.onNotification(SchemaAssociationNotification.type, (assocs) => {
      schemaAssociations = assocs;
      updateConfiguration();
    });

    this._conn.onNotification(SchemaContentChangeNotification.type, (uri) => {
      languageService.resetSchema(uri);
    });

    this._conn.onRequest(ForceValidateRequest.type, (uri) => {
      return new Promise<Diagnostic[]>((res) => {
        const d = docs.get(uri);
        if (d) {
          updateConfiguration();
          validateTextDocument(d, (ds) => {
            res(ds);
          });
        } else res([]);
      });
    });

    this._conn.onDidChangeWatchedFiles((ps) => {
      let dirty = false;
      ps.changes.forEach((c) => {
        if (languageService.resetSchema(c.uri)) dirty = true;
      });
      if (dirty) docs.all().forEach(triggerValidation);
    });

    this._conn.onShutdown(() => {
      jsonDocuments.dispose();
    });

    this._conn.onCompletion((ps, token) => {
      return runSafeAsync(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) return languageService.doComplete(d, ps.position, getJSONDocument(d));
          return null;
        },
        null,
        `Error while computing completions for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onCompletionResolve((i, token) => {
      return runSafeAsync(
        () => languageService.doResolve(i),
        i,
        `Error while resolving completion proposal`,
        token
      );
    });

    this._conn.onHover((ps, token) => {
      return runSafeAsync(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) return languageService.doHover(d, ps.position, getJSONDocument(d));
          return null;
        },
        null,
        `Error while computing hover for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onDocumentSymbol((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const j = getJSONDocument(d);
            const e = LimitExceededWarnings.onResultLimitExceeded(
              d.uri,
              resultLimit,
              'document symbols'
            );
            if (this._hasHierSymbols) {
              return languageService.findDocumentSymbols2(d, j, {
                resultLimit,
                e,
              });
            } else {
              return languageService.findDocumentSymbols(d, j, {
                resultLimit,
                e,
              });
            }
          }
          return [];
        },
        [],
        `Error while computing document symbols for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onDocumentRangeFormatting((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const es = languageService.format(d, ps.range, ps.options);
            if (es.length > formatterMaxNumberOfEdits) {
              const t = TextDocument.applyEdits(d, es);
              return [
                TextEdit.replace(
                  Range.create(Position.create(0, 0), d.positionAt(d.getText().length)),
                  t
                ),
              ];
            }
            return es;
          }
          return [];
        },
        [],
        `Error while formatting range for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onDocumentColor((ps, token) => {
      return runSafeAsync(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const e = LimitExceededWarnings.onResultLimitExceeded(
              d.uri,
              resultLimit,
              'document colors'
            );
            return languageService.findDocumentColors(d, getJSONDocument(d), {
              resultLimit,
              e,
            });
          }
          return [];
        },
        [],
        `Error while computing document colors for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onColorPresentation((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            return languageService.getColorPresentations(
              d,
              getJSONDocument(d),
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

    this._conn.onFoldingRanges((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d) {
            const e = LimitExceededWarnings.onResultLimitExceeded(
              d.uri,
              this._hasFoldLimit,
              'folding ranges'
            );
            return languageService.getFoldingRanges(d, {
              rangeLimit: this._hasFoldLimit,
              e,
            });
          }
          return null;
        },
        null,
        `Error while computing folding ranges for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onSelectionRanges((ps, token) => {
      return runSafe(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d)
            return languageService.getSelectionRanges(
              d,
              ps.positions,
              getJSONDocument(d)
            );
          return [];
        },
        [],
        `Error while computing selection ranges for ${ps.textDocument.uri}`,
        token
      );
    });

    this._conn.onDefinition((ps, token) => {
      return runSafeAsync(
        () => {
          const d = docs.get(ps.textDocument.uri);
          if (d)
            return languageService.findDefinition(d, ps.position, getJSONDocument(d));
          return [];
        },
        [],
        `Error while computing definitions for ${ps.textDocument.uri}`,
        token
      );
    });
  }
}

interface ISchemaAssociations {
  [pattern: string]: string[];
}

interface ISchemaAssociation {
  fileMatch: string[];
  uri: string;
}

namespace SchemaAssociationNotification {
  export const type: NotificationType<
    ISchemaAssociations | ISchemaAssociation[],
    any
  > = new NotificationType('json/schemaAssociations');
}

namespace VSCodeContentRequest {
  export const type: RequestType<string, string, any, any> = new RequestType(
    'vscode/content'
  );
}

namespace SchemaContentChangeNotification {
  export const type: NotificationType<string, any> = new NotificationType(
    'json/schemaContent'
  );
}

namespace ResultLimitReachedNotification {
  export const type: NotificationType<string, any> = new NotificationType(
    'json/resultLimitReached'
  );
}

namespace ForceValidateRequest {
  export const type: RequestType<string, Diagnostic[], any, any> = new RequestType(
    'json/validate'
  );
}

const workspaceContext = {
  resolveRelativePath: (relativePath: string, resource: string) => {
    return URL.resolve(resource, relativePath);
  },
};

const fileRequestService: SchemaRequestService = (uri: string) => {
  const fsPath = URI.parse(uri).fsPath;
  return new Promise<string>((c, e) => {
    fs.readFile(fsPath, 'UTF-8', (err, result) => {
      err ? e(err.message || err.toString()) : c(result.toString());
    });
  });
};

const httpRequestService: SchemaRequestService = (uri: string) => {
  const headers = { 'Accept-Encoding': 'gzip, deflate' };
  return xhr({ url: uri, followRedirects: 5, headers }).then(
    (response) => {
      return response.responseText;
    },
    (error: XHRResponse) => {
      return Promise.reject(
        error.responseText || getErrorStatusDescription(error.status) || error.toString()
      );
    }
  );
};

function getSchemaRequestService(handledSchemas: string[] = ['https', 'http', 'file']) {
  const builtInHandlers: { [protocol: string]: SchemaRequestService } = {};
  for (const protocol of handledSchemas) {
    if (protocol === 'file') {
      builtInHandlers[protocol] = fileRequestService;
    } else if (protocol === 'http' || protocol === 'https') {
      builtInHandlers[protocol] = httpRequestService;
    }
  }
  return (uri: string): Thenable<string> => {
    const protocol = uri.substr(0, uri.indexOf(':'));

    const builtInHandler = builtInHandlers[protocol];
    if (builtInHandler) {
      return builtInHandler(uri);
    }
    return con.sendRequest(VSCodeContentRequest.type, uri).then(
      (responseText) => {
        return responseText;
      },
      (error) => {
        return Promise.reject(error.message);
      }
    );
  };
}

let languageService = getLanguageService({
  workspaceContext,
  contributions: [],
  clientCapabilities: ClientCapabilities.LATEST,
});

const docs = new TextDocuments(TextDocument);
docs.listen(con);

function getJSONDocument(d: TextDocument): JSONDocument {
  return jsonDocuments.get(d);
}

let resultLimit = Number.MAX_VALUE;
let formatterMaxNumberOfEdits = Number.MAX_VALUE;

interface Settings {
  json: {
    schemas: JSONSchemaSettings[];
    format: { enable: boolean };
    resultLimit?: number;
  };
  http: {
    proxy: string;
    proxyStrictSSL: boolean;
  };
}

interface JSONSchemaSettings {
  fileMatch?: string[];
  url?: string;
  schema?: JSONSchema;
}

namespace LimitExceededWarnings {
  const pendingWarnings: {
    [uri: string]: { features: { [name: string]: string }; timeout?: NodeJS.Timeout };
  } = {};

  export function cancel(uri: string) {
    const warning = pendingWarnings[uri];
    if (warning && warning.timeout) {
      clearTimeout(warning.timeout);
      delete pendingWarnings[uri];
    }
  }

  export function onResultLimitExceeded(uri: string, resultLimit: number, name: string) {
    return () => {
      let warning = pendingWarnings[uri];
      if (warning) {
        if (!warning.timeout) {
          // already shown
          return;
        }
        warning.features[name] = name;
        warning.timeout.refresh();
      } else {
        warning = { features: { [name]: name } };
        warning.timeout = setTimeout(() => {
          con.sendNotification(
            ResultLimitReachedNotification.type,
            `${posix.basename(uri)}: For performance reasons, ${Object.keys(
              warning.features
            ).join(' and ')} have been limited to ${resultLimit} items.`
          );
          warning.timeout = undefined;
        }, 2000);
        pendingWarnings[uri] = warning;
      }
    };
  }
}

let jsonConfigurationSettings: JSONSchemaSettings[] | undefined = undefined;
let schemaAssociations:
  | ISchemaAssociations
  | ISchemaAssociation[]
  | undefined = undefined;
let formatterRegistration: Thenable<Disposable> | null = null;

function updateConfiguration() {
  const languageSettings = {
    validate: true,
    allowComments: true,
    schemas: new Array<SchemaConfiguration>(),
  };
  if (schemaAssociations) {
    if (Array.isArray(schemaAssociations)) {
      Array.prototype.push.apply(languageSettings.schemas, schemaAssociations);
    } else {
      for (const pattern in schemaAssociations) {
        const association = schemaAssociations[pattern];
        if (Array.isArray(association)) {
          association.forEach((uri) => {
            languageSettings.schemas.push({ uri, fileMatch: [pattern] });
          });
        }
      }
    }
  }
  if (jsonConfigurationSettings) {
    jsonConfigurationSettings.forEach((schema, index) => {
      let uri = schema.url;
      if (!uri && schema.schema) {
        uri = schema.schema.id || `vscode://schemas/custom/${index}`;
      }
      if (uri) {
        languageSettings.schemas.push({
          uri,
          fileMatch: schema.fileMatch,
          schema: schema.schema,
        });
      }
    });
  }
  languageService.configure(languageSettings);

  // Revalidate any open text documents
  docs.all().forEach(triggerValidation);
}

docs.onDidChangeContent((change) => {
  LimitExceededWarnings.cancel(change.document.uri);
  triggerValidation(change.document);
});

docs.onDidClose((event) => {
  LimitExceededWarnings.cancel(event.document.uri);
  cleanPendingValidation(event.document);
  con.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

const pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {};
const validationDelayMs = 300;

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

function validateTextDocument(
  textDocument: TextDocument,
  callback?: (diagnostics: Diagnostic[]) => void
): void {
  const respond = (diagnostics: Diagnostic[]) => {
    con.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    if (callback) {
      callback(diagnostics);
    }
  };
  if (textDocument.getText().length === 0) {
    respond([]); // ignore empty documents
    return;
  }
  const j = getJSONDocument(textDocument);
  const version = textDocument.version;

  const documentSettings: DocumentLanguageSettings =
    textDocument.languageId === 'jsonc'
      ? { comments: 'ignore', trailingCommas: 'warning' }
      : { comments: 'error', trailingCommas: 'error' };
  languageService.doValidation(textDocument, j, documentSettings).then(
    (diagnostics) => {
      setImmediate(() => {
        const currDocument = docs.get(textDocument.uri);
        if (currDocument && currDocument.version === version) {
          respond(diagnostics); // Send the computed diagnostics to VSCode.
        }
      });
    },
    (error) => {
      con.console.error(formatError(`Error while validating ${textDocument.uri}`, error));
    }
  );
}

const jsonDocuments = getLanguageModelCache<JSONDocument>(10, 60, (d) =>
  languageService.parseJSONDocument(d)
);
docs.onDidClose((e) => {
  jsonDocuments.onDocumentRemoved(e.document);
});
