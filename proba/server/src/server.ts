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
