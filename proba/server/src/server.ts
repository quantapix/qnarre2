import {
  CodeAction,
  CodeActionKind,
  Command,
  CompletionItem,
  CompletionItemKind,
  createConnection,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  InitializeResult,
  Position,
  ProposedFeatures,
  TextDocumentEdit,
  TextDocuments,
  TextDocumentSyncKind,
  TextEdit,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

const con = createConnection(ProposedFeatures.all);
con.console.info(`Sample server running in node ${process.version}`);

let configurable = false;
let diagnosable = false;
let workspace = false;

con.onInitialize((ps) => {
  const cs = ps.capabilities;
  configurable = !!(cs.workspace && !!cs.workspace.configuration);
  workspace = !!(cs.workspace && !!cs.workspace.workspaceFolders);
  diagnosable = !!(
    cs.textDocument &&
    cs.textDocument.publishDiagnostics &&
    cs.textDocument.publishDiagnostics.relatedInformation
  );
  const r: InitializeResult = {
    capabilities: {
      codeActionProvider: true,
      completionProvider: { resolveProvider: true },
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Incremental,
      },
      executeCommandProvider: { commands: ['sample.fixMe'] },
    },
  };
  if (workspace) {
    r.cs.workspace = { workspaceFolders: { supported: true } };
  }
  return r;
});

con.onInitialized(() => {
  if (configurable) {
    con.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (workspace) {
    con.workspace.onDidChangeWorkspaceFolders(() => {
      con.console.log('Workspace folder change event received.');
    });
  }
});

con.onCompletion((): CompletionItem[] => {
  return [
    { label: 'TypeScript', kind: CompletionItemKind.Text, data: 1 },
    { label: 'JavaScript', kind: CompletionItemKind.Text, data: 2 },
  ];
});

con.onCompletionResolve((i) => {
  if (i.data === 1) {
    i.detail = 'TypeScript details';
    i.documentation = 'TypeScript documentation';
  } else if (i.data === 2) {
    i.detail = 'JavaScript details';
    i.documentation = 'JavaScript documentation';
  }
  return i;
});

con.onDidChangeWatchedFiles(() => {
  con.console.log('Received file change event');
});

interface Settings {
  maxProblems: number;
}

const defaults = { maxProblems: 1000 } as Settings;
let gSets = defaults;
const dSets: Map<string, Thenable<Settings>> = new Map();

const docs: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

function getDSets(n: string) {
  if (!configurable) return Promise.resolve(gSets);
  let r = dSets.get(n);
  if (!r) {
    r = con.workspace.getConfiguration({
      scopeUri: n,
      section: 'languageServerExample',
    });
    dSets.set(n, r);
  }
  return r;
}

async function validate(d: TextDocument) {
  let ps = 0;
  const ds = [] as Diagnostic[];
  let m: RegExpExecArray | null;
  const t = d.getText();
  const pat = /\b[A-Z]{2,}\b/g;
  const ss = await getDSets(d.uri);
  while ((m = pat.exec(t)) && ps < ss.maxProblems) {
    ps++;
    const g: Diagnostic = {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: d.positionAt(m.index),
        end: d.positionAt(m.index + m[0].length),
      },
      message: `${m[0]} is all uppercase.`,
      source: 'ex',
    };
    if (diagnosable) {
      g.relatedInformation = [
        {
          location: {
            uri: d.uri,
            range: Object.assign({}, g.range),
          },
          message: 'Spelling matters',
        },
        {
          location: {
            uri: d.uri,
            range: Object.assign({}, g.range),
          },
          message: 'Particularly for names',
        },
      ];
    }
    ds.push(g);
  }
  con.sendDiagnostics({ uri: d.uri, version: d.version, diagnostics: ds });
}

con.onDidChangeConfiguration((ps) => {
  if (configurable) dSets.clear();
  else gSets = ps.settings.languageServerExample || defaults;
  docs.all().forEach(validate);
});

docs.onDidOpen((e) => {
  validate(e.document);
});

docs.onDidChangeContent((e) => {
  validate(e.document);
});

docs.onDidClose((e) => {
  dSets.delete(e.document.uri);
});

docs.listen(con);

con.onCodeAction((ps) => {
  const textDocument = docs.get(ps.textDocument.uri);
  if (textDocument === undefined) return undefined;
  const title = 'With User Input';
  return [
    CodeAction.create(
      title,
      Command.create(title, 'sample.fixMe', textDocument.uri),
      CodeActionKind.QuickFix
    ),
  ];
});

con.onExecuteCommand((ps) => {
  if (ps.command !== 'sample.fixMe' || ps.arguments === undefined) return;
  const textDocument = docs.get(ps.arguments[0]);
  if (textDocument === undefined) return;
  const newText = typeof ps.arguments[1] === 'string' ? ps.arguments[1] : 'Eclipse';
  con.workspace.applyEdit({
    documentChanges: [
      TextDocumentEdit.create({ uri: textDocument.uri, version: textDocument.version }, [
        TextEdit.insert(Position.create(0, 0), newText),
      ]),
    ],
  });
});

con.listen();

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
} from 'vscode-languageserver';

// Creates the LSP connection
const connection = createConnection(ProposedFeatures.all);

// Create a manager for open text documents
const documents = new TextDocuments();

// The workspace folder this server is operating on
let workspaceFolder: string | null;

documents.onDidOpen((event) => {
  connection.console.log(
    `[Server(${process.pid}) ${workspaceFolder}] Document opened: ${event.document.uri}`
  );
});
documents.listen(connection);

connection.onInitialize((params) => {
  workspaceFolder = params.rootUri;
  connection.console.log(
    `[Server(${process.pid}) ${workspaceFolder}] Started and initialize received`
  );
  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.None,
      },
    },
  };
});
connection.listen();

import {
  CompletionList,
  createConnection,
  Diagnostic,
  InitializeParams,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver';
import { getLanguageModes, LanguageModes } from './languageModes';
import { TextDocument } from 'vscode-languageserver-textdocument';

let connection = createConnection(ProposedFeatures.all);

let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let languageModes: LanguageModes;

connection.onInitialize((_params: InitializeParams) => {
  languageModes = getLanguageModes();

  documents.onDidClose((e) => {
    languageModes.onDocumentRemoved(e.document);
  });
  connection.onShutdown(() => {
    languageModes.dispose();
  });

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      // Tell the client that the server supports code completion
      completionProvider: {
        resolveProvider: false,
      },
    },
  };
});

connection.onInitialized(() => {});

connection.onDidChangeConfiguration((_change) => {
  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument) {
  try {
    const version = textDocument.version;
    const diagnostics: Diagnostic[] = [];
    if (textDocument.languageId === 'html1') {
      const modes = languageModes.getAllModesInDocument(textDocument);
      const latestTextDocument = documents.get(textDocument.uri);
      if (latestTextDocument && latestTextDocument.version === version) {
        // check no new version has come in after in after the async op
        modes.forEach((mode) => {
          if (mode.doValidation) {
            mode.doValidation(latestTextDocument).forEach((d) => {
              diagnostics.push(d);
            });
          }
        });
        connection.sendDiagnostics({ uri: latestTextDocument.uri, diagnostics });
      }
    }
  } catch (e) {
    connection.console.error(`Error while validating ${textDocument.uri}`);
    connection.console.error(e);
  }
}

connection.onCompletion(async (textDocumentPosition, token) => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  if (!document) {
    return null;
  }

  const mode = languageModes.getModeAtPosition(document, textDocumentPosition.position);
  if (!mode || !mode.doComplete) {
    return CompletionList.create();
  }
  const doComplete = mode.doComplete;

  return doComplete(document, textDocumentPosition.position);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { getLanguageService } from 'vscode-html-languageservice';
import {
  createConnection,
  InitializeParams,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const htmlLanguageService = getLanguageService();

connection.onInitialize((_params: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      // Tell the client that the server supports code completion
      completionProvider: {
        resolveProvider: false,
      },
    },
  };
});

connection.onInitialized(() => {});

connection.onCompletion(async (textDocumentPosition, token) => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  if (!document) {
    return null;
  }

  return htmlLanguageService.doComplete(
    document,
    textDocumentPosition.position,
    htmlLanguageService.parseHTMLDocument(document)
  );
});

documents.listen(connection);
connection.listen();

/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
  createConnection,
  TextDocuments,
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
} from 'vscode-languageserver';

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
  let capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we will fall back using global settings
  hasConfigurationCapability =
    !!capabilities.workspace && !!capabilities.workspace.configuration;
  hasWorkspaceFolderCapability =
    !!capabilities.workspace && !!capabilities.workspace.workspaceFolders;
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      // Tell the client that the server supports code completion
      completionProvider: {
        resolveProvider: true,
      },
    },
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.');
    });
  }
});

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <ExampleSettings>(
      (change.settings.languageServerExample || defaultSettings)
    );
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'languageServerExample',
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // In this simple example we get the settings for every validate run.
  let settings = await getDocumentSettings(textDocument.uri);

  // The validator creates diagnostics for all uppercase words length 2 and more
  let text = textDocument.getText();
  let pattern = /\b[A-Z]{2,}\b/g;
  let m: RegExpExecArray | null;

  let problems = 0;
  let diagnostics: Diagnostic[] = [];
  while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
    problems++;
    let diagnosic: Diagnostic = {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(m.index),
        end: textDocument.positionAt(m.index + m[0].length),
      },
      message: `${m[0]} is all uppercase.`,
      source: 'ex',
    };
    if (hasDiagnosticRelatedInformationCapability) {
      diagnosic.relatedInformation = [
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnosic.range),
          },
          message: 'Spelling matters',
        },
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnosic.range),
          },
          message: 'Particularly for names',
        },
      ];
    }
    diagnostics.push(diagnosic);
  }

  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.
    return [
      {
        label: 'TypeScript',
        kind: CompletionItemKind.Text,
        data: 1,
      },
      {
        label: 'JavaScript',
        kind: CompletionItemKind.Text,
        data: 2,
      },
    ];
  }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    if (item.data === 1) {
      (item.detail = 'TypeScript details'),
        (item.documentation = 'TypeScript documentation');
    } else if (item.data === 2) {
      (item.detail = 'JavaScript details'),
        (item.documentation = 'JavaScript documentation');
    }
    return item;
  }
);

/*
connection.onDidOpenTextDocument((params) => {
	// A text document got opened in VSCode.
	// params.uri uniquely identifies the document. For documents store on disk this is a file URI.
	// params.text the initial full content of the document.
	connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
	// The content of a text document did change in VSCode.
	// params.uri uniquely identifies the document.
	// params.contentChanges describe the content changes to the document.
	connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
	// A text document got closed in VSCode.
	// params.uri uniquely identifies the document.
	connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
