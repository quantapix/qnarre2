import {
  CodeAction,
  CodeActionKind,
  Command,
  CompletionItem,
  CompletionItemKind,
  CompletionList,
  createConnection,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  InitializeParams,
  InitializeResult,
  Position,
  ProposedFeatures,
  TextDocumentEdit,
  TextDocuments,
  TextDocumentSyncKind,
  TextEdit,
} from 'vscode-languageserver';
import { getLanguageModes, LanguageModes } from './languageModes';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLanguageService } from 'vscode-html-languageservice';

const con = createConnection(ProposedFeatures.all);
con.console.info(`Sample server running in node ${process.version}`);

let config = false;
let diagnose = false;
let workspace = false;

con.onInitialize((ps) => {
  const cs = ps.capabilities;
  config = !!(cs.workspace && !!cs.workspace.configuration);
  workspace = !!(cs.workspace && !!cs.workspace.workspaceFolders);
  diagnose = !!(
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
  if (workspace) r.cs.workspace = { workspaceFolders: { supported: true } };
  return r;
});

let languageModes: LanguageModes;

con.onInitialize((_ps: InitializeParams) => {
  languageModes = getLanguageModes();
  docs.onDidClose((e) => {
    languageModes.onDocumentRemoved(e.document);
  });
  con.onShutdown(() => {
    languageModes.dispose();
  });
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: { resolveProvider: false },
    },
  };
});

const htmlLanguageService = getLanguageService();

con.onInitialize((_: InitializeParams) => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: {
        resolveProvider: false,
      },
    },
  };
});

con.onInitialized(() => {
  if (config) {
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

con.onCompletion(async (ps, _) => {
  const d = docs.get(ps.textDocument.uri);
  if (!d) return null;
  const m = languageModes.getModeAtPosition(d, ps.position);
  if (!m || !m.doComplete) return CompletionList.create();
  return m.doComplete(d, ps.position);
});

con.onCompletion(async (ps, _) => {
  const d = docs.get(ps.textDocument.uri);
  if (!d) return null;
  return htmlLanguageService.doComplete(
    d,
    ps.position,
    htmlLanguageService.parseHTMLDocument(d)
  );
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

const defaults: Settings = { maxProblems: 1000 };
let gSets = defaults;
const dSets: Map<string, Thenable<Settings>> = new Map();

const docs: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

function getDSets(n: string) {
  if (!config) return Promise.resolve(gSets);
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
  const ds = [] as Diagnostic[];
  let m: RegExpExecArray | null;
  const t = d.getText();
  const pat = /\b[A-Z]{2,}\b/g;
  const ss = await getDSets(d.uri);
  let ps = 0;
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
    if (diagnose) {
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

async function validate2(d: TextDocument) {
  try {
    const version = d.version;
    const ds: Diagnostic[] = [];
    if (d.languageId === 'html1') {
      const ms = languageModes.getAllModesInDocument(d);
      const t = docs.get(d.uri);
      if (t && t.version === version) {
        ms.forEach((m) => {
          if (m.doValidation) {
            m.doValidation(t).forEach((d) => {
              ds.push(d);
            });
          }
        });
        con.sendDiagnostics({ uri: t.uri, ds });
      }
    }
  } catch (e) {
    con.console.error(`Error while validating ${d.uri}`);
    con.console.error(e);
  }
}

con.onDidChangeConfiguration((ps) => {
  if (config) dSets.clear();
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
  const d = docs.get(ps.textDocument.uri);
  if (d) {
    const t = 'With User Input';
    return [
      CodeAction.create(
        t,
        Command.create(t, 'sample.fixMe', d.uri),
        CodeActionKind.QuickFix
      ),
    ];
  }
  return;
});

con.onExecuteCommand((ps) => {
  if (ps.command !== 'sample.fixMe' || !ps.arguments) return;
  const d = docs.get(ps.arguments[0]);
  if (d) {
    const newText = typeof ps.arguments[1] === 'string' ? ps.arguments[1] : 'Eclipse';
    con.workspace.applyEdit({
      documentChanges: [
        TextDocumentEdit.create({ uri: d.uri, version: d.version }, [
          TextEdit.insert(Position.create(0, 0), newText),
        ]),
      ],
    });
  }
});

con.listen();

// ==================== //

let workspaceFolder: string | null;

docs.onDidOpen((e) => {
  con.console.log(
    `[Server(${process.pid}) ${workspaceFolder}] Document opened: ${e.document.uri}`
  );
});

docs.listen(con);

con.onInitialize((ps) => {
  workspaceFolder = ps.rootUri;
  con.console.log(
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

con.listen();

con.onDidOpenTextDocument((ps) => {
  con.console.log(`${ps.textDocument.uri} opened.`);
});
con.onDidChangeTextDocument((ps) => {
  con.console.log(`${ps.textDocument.uri} changed: ${JSON.stringify(ps.contentChanges)}`);
});
con.onDidCloseTextDocument((ps) => {
  con.console.log(`${ps.textDocument.uri} closed.`);
});
