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
}

const con = createConnection();

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

// create the JSON language service
let languageService = getLanguageService({
  workspaceContext,
  contributions: [],
  clientCapabilities: ClientCapabilities.LATEST,
});

const docs = new TextDocuments(TextDocument);
docs.listen(con);

let resultLimit = Number.MAX_VALUE;
let formatterMaxNumberOfEdits = Number.MAX_VALUE;

// The settings interface describes the server relevant settings part
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

// The settings have changed. Is send on server activation as well.
con.onDidChangeConfiguration((change: DidChangeConfigurationParams) => {
  const settings = <Settings>change.settings;
  configureHttpRequests(
    settings.http && settings.http.proxy,
    settings.http && settings.http.proxyStrictSSL
  );

  jsonConfigurationSettings = settings.json && settings.json.schemas;
  updateConfiguration();

  this._hasFoldLimit = Math.trunc(
    Math.max((settings.json && settings.json.resultLimit) || this._hasFoldLimit, 0)
  );
  resultLimit = Math.trunc(
    Math.max((settings.json && settings.json.resultLimit) || Number.MAX_VALUE, 0)
  );

  // dynamically enable & disable the formatter
  if (this._hasDynRegistry) {
    const enableFormatter =
      settings && settings.json && settings.json.format && settings.json.format.enable;
    if (enableFormatter) {
      if (!formatterRegistration) {
        formatterRegistration = con.client.register(DocumentRangeFormattingRequest.type, {
          documentSelector: [{ language: 'json' }, { language: 'jsonc' }],
        });
      }
    } else if (formatterRegistration) {
      formatterRegistration.then((r) => r.dispose());
      formatterRegistration = null;
    }
  }
});

// The jsonValidation extension configuration has changed
con.onNotification(SchemaAssociationNotification.type, (associations) => {
  schemaAssociations = associations;
  updateConfiguration();
});

// A schema has changed
con.onNotification(SchemaContentChangeNotification.type, (uri) => {
  languageService.resetSchema(uri);
});

// Retry schema validation on all open documents
con.onRequest(ForceValidateRequest.type, (uri) => {
  return new Promise<Diagnostic[]>((resolve) => {
    const document = docs.get(uri);
    if (document) {
      updateConfiguration();
      validateTextDocument(document, (diagnostics) => {
        resolve(diagnostics);
      });
    } else {
      resolve([]);
    }
  });
});

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

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
docs.onDidChangeContent((change) => {
  LimitExceededWarnings.cancel(change.document.uri);
  triggerValidation(change.document);
});

// a document has closed: clear all diagnostics
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
  const jsonDocument = getJSONDocument(textDocument);
  const version = textDocument.version;

  const documentSettings: DocumentLanguageSettings =
    textDocument.languageId === 'jsonc'
      ? { comments: 'ignore', trailingCommas: 'warning' }
      : { comments: 'error', trailingCommas: 'error' };
  languageService.doValidation(textDocument, jsonDocument, documentSettings).then(
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

con.onDidChangeWatchedFiles((change) => {
  // Monitored files have changed in VSCode
  let hasChanges = false;
  change.changes.forEach((c) => {
    if (languageService.resetSchema(c.uri)) {
      hasChanges = true;
    }
  });
  if (hasChanges) {
    docs.all().forEach(triggerValidation);
  }
});

const jsonDocuments = getLanguageModelCache<JSONDocument>(10, 60, (document) =>
  languageService.parseJSONDocument(document)
);
docs.onDidClose((e) => {
  jsonDocuments.onDocumentRemoved(e.document);
});
con.onShutdown(() => {
  jsonDocuments.dispose();
});

function getJSONDocument(document: TextDocument): JSONDocument {
  return jsonDocuments.get(document);
}

con.onCompletion((textDocumentPosition, token) => {
  return runSafeAsync(
    async () => {
      const document = docs.get(textDocumentPosition.textDocument.uri);
      if (document) {
        const jsonDocument = getJSONDocument(document);
        return languageService.doComplete(
          document,
          textDocumentPosition.position,
          jsonDocument
        );
      }
      return null;
    },
    null,
    `Error while computing completions for ${textDocumentPosition.textDocument.uri}`,
    token
  );
});

con.onCompletionResolve((completionItem, token) => {
  return runSafeAsync(
    () => {
      return languageService.doResolve(completionItem);
    },
    completionItem,
    `Error while resolving completion proposal`,
    token
  );
});

con.onHover((textDocumentPositionParams, token) => {
  return runSafeAsync(
    async () => {
      const document = docs.get(textDocumentPositionParams.textDocument.uri);
      if (document) {
        const jsonDocument = getJSONDocument(document);
        return languageService.doHover(
          document,
          textDocumentPositionParams.position,
          jsonDocument
        );
      }
      return null;
    },
    null,
    `Error while computing hover for ${textDocumentPositionParams.textDocument.uri}`,
    token
  );
});

con.onDocumentSymbol((documentSymbolParams, token) => {
  return runSafe(
    () => {
      const document = docs.get(documentSymbolParams.textDocument.uri);
      if (document) {
        const jsonDocument = getJSONDocument(document);
        const onResultLimitExceeded = LimitExceededWarnings.onResultLimitExceeded(
          document.uri,
          resultLimit,
          'document symbols'
        );
        if (this._hasHierSymbols) {
          return languageService.findDocumentSymbols2(document, jsonDocument, {
            resultLimit,
            onResultLimitExceeded,
          });
        } else {
          return languageService.findDocumentSymbols(document, jsonDocument, {
            resultLimit,
            onResultLimitExceeded,
          });
        }
      }
      return [];
    },
    [],
    `Error while computing document symbols for ${documentSymbolParams.textDocument.uri}`,
    token
  );
});

con.onDocumentRangeFormatting((formatParams, token) => {
  return runSafe(
    () => {
      const document = docs.get(formatParams.textDocument.uri);
      if (document) {
        const edits = languageService.format(
          document,
          formatParams.range,
          formatParams.options
        );
        if (edits.length > formatterMaxNumberOfEdits) {
          const newText = TextDocument.applyEdits(document, edits);
          return [
            TextEdit.replace(
              Range.create(
                Position.create(0, 0),
                document.positionAt(document.getText().length)
              ),
              newText
            ),
          ];
        }
        return edits;
      }
      return [];
    },
    [],
    `Error while formatting range for ${formatParams.textDocument.uri}`,
    token
  );
});

con.onDocumentColor((ps, token) => {
  return runSafeAsync(
    async () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        const onResultLimitExceeded = LimitExceededWarnings.onResultLimitExceeded(
          document.uri,
          resultLimit,
          'document colors'
        );
        const jsonDocument = getJSONDocument(document);
        return languageService.findDocumentColors(document, jsonDocument, {
          resultLimit,
          onResultLimitExceeded,
        });
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
        const jsonDocument = getJSONDocument(document);
        return languageService.getColorPresentations(
          document,
          jsonDocument,
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

con.onFoldingRanges((ps, token) => {
  return runSafe(
    () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        const onRangeLimitExceeded = LimitExceededWarnings.onResultLimitExceeded(
          document.uri,
          this._hasFoldLimit,
          'folding ranges'
        );
        return languageService.getFoldingRanges(document, {
          rangeLimit: this._hasFoldLimit,
          onRangeLimitExceeded,
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
      if (document) {
        const jsonDocument = getJSONDocument(document);
        return languageService.getSelectionRanges(document, ps.positions, jsonDocument);
      }
      return [];
    },
    [],
    `Error while computing selection ranges for ${ps.textDocument.uri}`,
    token
  );
});

con.onDefinition((ps, token) => {
  return runSafeAsync(
    async () => {
      const document = docs.get(ps.textDocument.uri);
      if (document) {
        const jsonDocument = getJSONDocument(document);
        return languageService.findDefinition(document, ps.position, jsonDocument);
      }
      return [];
    },
    [],
    `Error while computing definitions for ${ps.textDocument.uri}`,
    token
  );
});

// Listen on the connection
con.listen();
