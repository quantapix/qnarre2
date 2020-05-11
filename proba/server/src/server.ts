import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentSyncKind,
  InitializeResult,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

const con = createConnection(ProposedFeatures.all);

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
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { resolveProvider: true },
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
    con.workspace.onDidChangeWorkspaceFolders((_e) => {
      con.console.log('Workspace folder change event received.');
    });
  }
});

con.onCompletion((_ps): CompletionItem[] => {
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

con.onDidChangeWatchedFiles((_ps) => {
  con.console.log('Received file change event');
});

interface Settings {
  maxProblems: number;
}

const defaults = { maxProblems: 1000 } as Settings;
let gSets = defaults;
let dSets: Map<string, Thenable<Settings>> = new Map();

const docs: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

con.onDidChangeConfiguration((ps) => {
  if (configurable) dSets.clear();
  else gSets = ps.settings.languageServerExample || defaults;
  docs.all().forEach(validateDoc);
});

docs.onDidChangeContent((e) => {
  validateDoc(e.document);
});

docs.onDidClose((e) => {
  dSets.delete(e.document.uri);
});

docs.listen(con);
con.listen();

async function validateDoc(d: TextDocument) {
  let ps = 0;
  let ds = [] as Diagnostic[];
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
  con.sendDiagnostics({ uri: d.uri, diagnostics: ds });
}

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
