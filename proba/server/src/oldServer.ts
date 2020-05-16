import {
  CodeAction,
  CodeActionKind,
  Command,
  CompletionItem,
  createConnection,
  CreateFile,
  DeclarationLink,
  Definition,
  DefinitionLink,
  Diagnostic,
  DocumentHighlight,
  DocumentHighlightKind,
  Hover,
  InitializeError,
  InitializeResult,
  Location,
  MarkupKind,
  MessageActionItem,
  NotificationType,
  Position,
  Range,
  ResponseError,
  SignatureHelp,
  SymbolInformation,
  SymbolKind,
  TextDocumentEdit,
  TextDocuments,
  TextDocumentSyncKind,
  TextEdit,
  VersionedTextDocumentIdentifier,
  ProposedFeatures,
  DiagnosticTag,
  Proposed,
  InsertTextFormat,
  SelectionRangeRequest,
  SelectionRange,
  InsertReplaceEdit,
} from 'vscode-languageserver';

import { TextDocument } from 'vscode-languageserver-textdocument';

const con = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

documents.listen(con);

documents.onWillSave((event) => {
  con.console.log('On Will save received');
});

con.telemetry.logEvent({
  name: 'my custome event',
  data: {
    foo: 10,
  },
});

interface ActionItem extends MessageActionItem {
  id: string;
}

let folder: string;

enum TokenTypes {
  comment = 0,
  keyword = 1,
  string = 2,
  number = 3,
  regexp = 4,
  type = 5,
  class = 6,
  interface = 7,
  enum = 8,
  typeParameter = 9,
  function = 10,
  member = 11,
  property = 12,
  variable = 13,
  parameter = 14,
  lambdaFunction = 15,
  _ = 16,
}

enum TokenModifiers {
  abstract = 0,
  deprecated = 1,
  _ = 2,
}

function computeLegend(
  capability: Proposed.SemanticTokensClientCapabilities
): Proposed.SemanticTokensLegend {
  const clientTokenTypes = new Set<string>(
    capability.textDocument.semanticTokens.tokenTypes
  );
  const clientTokenModifiers = new Set<string>(
    capability.textDocument.semanticTokens.tokenModifiers
  );

  const tokenTypes: string[] = [];
  for (let i = 0; i < TokenTypes._; i++) {
    const str = TokenTypes[i];
    if (clientTokenTypes.has(str)) {
      tokenTypes.push(str);
    } else {
      if (str === 'lambdaFunction') {
        tokenTypes.push('function');
      } else {
        tokenTypes.push('type');
      }
    }
  }

  const tokenModifiers: string[] = [];
  for (let i = 0; i < TokenModifiers._; i++) {
    const str = TokenModifiers[i];
    if (clientTokenModifiers.has(str)) {
      tokenModifiers.push(str);
    }
  }

  return { tokenTypes, tokenModifiers };
}

con.onInitialize((params, cancel, progress):
  | Thenable<InitializeResult>
  | ResponseError<InitializeError>
  | InitializeResult => {
  progress.begin('Initializing test server');

  for (const folder of params.workspaceFolders) {
    con.console.log(`${folder.name} ${folder.uri}`);
  }
  if (params.workspaceFolders && params.workspaceFolders.length > 0) {
    folder = params.workspaceFolders[0].uri;
  }

  return new Promise((resolve, reject) => {
    const tokenLegend = computeLegend(
      params.capabilities as Proposed.SemanticTokensClientCapabilities
    );
    const result: InitializeResult & {
      capabilities: Proposed.CallHierarchyServerCapabilities &
        Proposed.SemanticTokensServerCapabilities;
    } = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Full,
        hoverProvider: true,
        completionProvider: {
          resolveProvider: false,
        },
        signatureHelpProvider: {},
        definitionProvider: true,
        referencesProvider: { workDoneProgress: true },
        documentHighlightProvider: true,
        documentSymbolProvider: true,
        workspaceSymbolProvider: true,
        codeActionProvider: {
          codeActionKinds: [
            CodeActionKind.Refactor,
            CodeActionKind.Source,
            CodeActionKind.SourceOrganizeImports,
          ],
        },
        codeLensProvider: {
          resolveProvider: true,
        },
        documentFormattingProvider: true,
        documentRangeFormattingProvider: true,
        documentOnTypeFormattingProvider: {
          firstTriggerCharacter: ';',
          moreTriggerCharacter: ['}', '\n'],
        },
        renameProvider: true,
        workspace: {
          workspaceFolders: {
            supported: true,
            changeNotifications: true,
          },
        },
        implementationProvider: {
          id: 'mdjdjjdnnnndjjjjddd',
          documentSelector: ['bat'],
        },
        typeDefinitionProvider: true,
        declarationProvider: { workDoneProgress: true },
        executeCommandProvider: {
          commands: ['testbed.helloWorld'],
        },
        callHierarchyProvider: true,
        selectionRangeProvider: { workDoneProgress: true },
        semanticTokensProvider: {
          legend: tokenLegend,
          documentProvider: {
            edits: true,
          },
          rangeProvider: true,
        },
      },
    };
    setTimeout(() => {
      resolve(result);
    }, 50);
  });
});

con.onInitialized((params) => {
  con.workspace.onDidChangeWorkspaceFolders((event) => {
    con.console.log('Workspace folder changed received');
  });
  con.workspace.getWorkspaceFolders().then((folders) => {
    for (const folder of folders) {
      con.console.log(`Get workspace folders: ${folder.name} ${folder.uri}`);
    }
  });
});

con.onShutdown((handler) => {
  con.console.log('Shutdown received');
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(undefined);
    }, 3000);
  });
});

documents.onDidChangeContent((event) => {
  const document = event.document;
  con.sendDiagnostics({ uri: document.uri, diagnostics: validate(document) });
});

documents.onDidSave((event) => {
  con.console.info(`Document got saved: ${event.document.uri} ${event.document.version}`);
});

con.onDidChangeWatchedFiles((params) => {
  con.console.log('File change event received');
  documents.all().forEach((document) => {
    con.sendDiagnostics({ uri: document.uri, diagnostics: validate(document) });
  });
});

con.onDidChangeConfiguration((params) => {
  documents.all().forEach((document) => {
    con.sendDiagnostics({ uri: document.uri, diagnostics: validate(document) });
  });
  con.workspace.getConfiguration('testbed').then((value) => {
    con.console.log('Configuration received');
  });
});

/**
 * Some doc
 * @param document
 */
function validate(document: TextDocument): Diagnostic[] {
  // connection.window.createWorkDoneProgress().then((progress) => {
  // 	progress.begin('Validating', 0, 'happy coding', true);
  // 	let counter = 1;
  // 	let interval = setInterval(() => {
  // 		if (counter === 11) {
  // 			clearInterval(interval);
  // 			progress.done();
  // 		} else {
  // 			progress.report(counter++ * 10);
  // 		}
  // 	}, 1000);
  // 	progress.token.onCancellationRequested(() => {
  // 		progress.done();
  // 		clearInterval(interval);
  // 	});
  // });
  con.console.log('Validaing document ' + document.uri);
  return [
    {
      range: Range.create(0, 0, 0, 10),
      message: 'A error message',
      tags: [DiagnosticTag.Unnecessary],
    },
  ];
}

con.onHover(
  (textPosition): Hover => {
    // let doc : MarkedString[] = ["# Title","### description"]
    return {
      contents: {
        kind: MarkupKind.PlainText,
        value: 'foo\nbar',
      },
      // contents: {
      // 	kind: MarkupKind.Markdown,
      // 	value: [
      // 		'```typescript',
      // 		'function validate(document: TextDocument): Diagnostic[]',
      // 		'```',
      // 		'___',
      // 		'Some doc',
      // 		'',
      // 		'_@param_ `document` '
      // 	].join('\n')
      // }
      // contents: doc
    };
  }
);

con.onCompletion((params, token): CompletionItem[] => {
  const result: CompletionItem[] = [];
  let item = CompletionItem.create('foo');
  result.push(item);

  item = CompletionItem.create('foo-text');
  item.insertText = 'foo-text';
  result.push(item);

  item = CompletionItem.create('foo-text-range-insert');
  item.textEdit = TextEdit.insert(params.position, 'foo-text-range-insert');
  result.push(item);

  item = CompletionItem.create('foo-text-range-replace');
  item.textEdit = TextEdit.replace(
    Range.create(
      Position.create(params.position.line, params.position.character - 1),
      params.position
    ),
    'foo-text-range-replace'
  );
  item.filterText = 'b';
  result.push(item);

  item = CompletionItem.create('bar');
  item.textEdit = InsertReplaceEdit.create(
    'bar',
    Range.create(params.position, params.position),
    Range.create(
      params.position,
      Position.create(params.position.line, params.position.character + 1)
    )
  );
  result.push(item);

  return result;
});

con.onCompletionResolve(
  (item): CompletionItem => {
    item.detail = 'This is a special hello world function';
    item.documentation = {
      kind: MarkupKind.Markdown,
      value: ['# Heading', '```typescript', 'console.log("Hello World");', '```'].join(
        '\n'
      ),
    };
    return item;
  }
);

con.onSignatureHelp(
  (item): SignatureHelp => {
    return {
      signatures: [{ label: 'Hello World Signature' }],
      activeSignature: 0,
      activeParameter: 0,
    };
  }
);

con.onDefinition((params): DefinitionLink[] => {
  // return { uri: params.textDocument.uri, range: { start: { line: 0, character: 0}, end: {line: 0, character: 10 }}};
  return [
    {
      targetUri: params.textDocument.uri,
      targetRange: { start: { line: 0, character: 2 }, end: { line: 5, character: 45 } },
      targetSelectionRange: {
        start: { line: 1, character: 5 },
        end: { line: 1, character: 10 },
      },
      originSelectionRange: {
        start: {
          line: params.position.line,
          character: Math.max(0, params.position.character - 4),
        },
        end: { line: params.position.line, character: params.position.character + 4 },
      },
    },
  ];
});

con.onDeclaration((params): DeclarationLink[] => {
  return [
    {
      targetUri: params.textDocument.uri,
      targetRange: { start: { line: 3, character: 0 }, end: { line: 3, character: 10 } },
      targetSelectionRange: {
        start: { line: 3, character: 0 },
        end: { line: 3, character: 10 },
      },
      originSelectionRange: {
        start: {
          line: params.position.line,
          character: Math.max(0, params.position.line - 4),
        },
        end: { line: params.position.line, character: params.position.line + 4 },
      },
    },
  ];
});

con.onImplementation(
  (params): Promise<Definition> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve({
          uri: params.textDocument.uri,
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
        });
      }, 2000);
    });
  }
);

con.onTypeDefinition(
  (params): Definition => {
    return {
      uri: params.textDocument.uri,
      range: { start: { line: 2, character: 0 }, end: { line: 2, character: 10 } },
    };
  }
);

con.onReferences((params): Location[] => {
  return [
    {
      uri: params.textDocument.uri,
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
    },
    {
      uri: params.textDocument.uri,
      range: { start: { line: 2, character: 0 }, end: { line: 2, character: 20 } },
    },
  ];
});

con.onDocumentHighlight((textPosition) => {
  const position = textPosition.position;
  return [
    DocumentHighlight.create(
      {
        start: { line: position.line + 1, character: position.character },
        end: { line: position.line + 1, character: position.character + 5 },
      },
      DocumentHighlightKind.Write
    ),
  ];
});

con.onDocumentSymbol((identifier) => {
  return [
    SymbolInformation.create('Item 1', SymbolKind.Function, {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 10 },
    }),
    SymbolInformation.create('Item 2', SymbolKind.Function, {
      start: { line: 1, character: 0 },
      end: { line: 1, character: 10 },
    }),
  ];
});

con.onWorkspaceSymbol((params) => {
  return [
    SymbolInformation.create(
      'Workspace Item 1',
      SymbolKind.Function,
      {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 10 },
      },
      `${folder}/test.bat`
    ),
    SymbolInformation.create(
      'Workspace Item 2',
      SymbolKind.Function,
      {
        start: { line: 1, character: 0 },
        end: { line: 1, character: 10 },
      },
      `${folder}/test.bat`
    ),
  ];
});

con.onCodeAction((params) => {
  const document = documents.get(params.textDocument.uri);
  const codeAction: CodeAction = {
    title: 'Custom Code Action',
    kind: CodeActionKind.QuickFix,
    edit: {
      documentChanges: [
        TextDocumentEdit.create(
          VersionedTextDocumentIdentifier.create(document.uri, document.version),
          [TextEdit.insert({ line: 0, character: 0 }, 'Code Action')]
        ),
        CreateFile.create(`${folder}/newFile.bat`, { overwrite: true }),
        TextDocumentEdit.create(
          VersionedTextDocumentIdentifier.create(`${folder}/newFile.bat`, null),
          [TextEdit.insert({ line: 0, character: 0 }, 'The initial content')]
        ),
      ],
    },
  };
  return [codeAction];
});

con.onCodeLens((params) => {
  return [
    {
      range: Range.create(2, 0, 2, 10),
      command: Command.create('My Code Lens', 'commandId'),
      data: '1',
    },
  ];
});

con.onDocumentFormatting((params) => {
  return [TextEdit.insert(Position.create(1, 0), 'A new line\n')];
});

con.onDocumentRangeFormatting((params) => {
  con.console.log(
    `Document Range Formatting: ${JSON.stringify(params.range)} ${JSON.stringify(
      params.options
    )}`
  );
  return [];
});

con.onDocumentOnTypeFormatting((params) => {
  con.console.log(
    `Document On Type Formatting: ${JSON.stringify(params.position)} ${
      params.ch
    } ${JSON.stringify(params.options)}`
  );
  return [];
});

con.onRenameRequest((params) => {
  con.console.log(`Rename: ${JSON.stringify(params.position)} ${params.newName}`);
  return new ResponseError(20, "Element can't be renaned");
  // let change = new WorkspaceChange();
  // change.getTextEditChange(params.textDocument.uri).insert(Position.create(0,0), 'Raname inserted\n');
  // return change.edit;
});

con.onExecuteCommand((params) => {
  if (params.command === 'testbed.helloWorld') {
    throw new Error('Command execution failed');
  }
  return undefined;
});

con.onRequest('addTwenty', (param) => {
  return { value: param.value + 20 };
});

const not: NotificationType<string[], void> = new NotificationType<string[], void>(
  'testbed/notification'
);
con.onNotification(not, (arr) => {
  con.console.log('Is array: ' + Array.isArray(arr));
});

con.onRequest(SelectionRangeRequest.type, (params) => {
  const result: SelectionRange = {
    range: {
      start: {
        line: params.positions[0].line,
        character: Math.max(0, params.positions[0].character - 10),
      },
      end: {
        line: params.positions[0].line,
        character: params.positions[0].character + 10,
      },
    },
  };

  return [result];
});

connection.languages.callHierarchy.onPrepare((params) => {
  return [];
});

const tokenBuilders: Map<string, ProposedFeatures.SemanticTokensBuilder> = new Map();
function getTokenBuilder(document: TextDocument): ProposedFeatures.SemanticTokensBuilder {
  let result = tokenBuilders.get(document.uri);
  if (result !== undefined) {
    return result;
  }
  result = new ProposedFeatures.SemanticTokensBuilder();
  tokenBuilders.set(document.uri, result);
  return result;
}
function buildTokens(
  builder: ProposedFeatures.SemanticTokensBuilder,
  document: TextDocument
) {
  const text = document.getText();
  const regexp = /\w+/g;
  let match: RegExpMatchArray;
  let tokenCounter = 0;
  let modifierCounter = 0;
  while ((match = regexp.exec(text)) !== null) {
    const word = match[0];
    const position = document.positionAt(match.index);
    const tokenType = tokenCounter % TokenTypes._;
    const tokenModifier = 1 << modifierCounter % TokenModifiers._;
    builder.push(
      position.line,
      position.character,
      word.length,
      tokenType,
      tokenModifier
    );
    tokenCounter++;
    modifierCounter++;
  }
}

connection.languages.semanticTokens.on((params) => {
  const document = documents.get(params.textDocument.uri);
  if (document === undefined) {
    return { data: [] };
  }
  const builder = getTokenBuilder(document);
  buildTokens(builder, document);
  return builder.build();
});

connection.languages.semanticTokens.onEdits((params) => {
  const document = documents.get(params.textDocument.uri);
  if (document === undefined) {
    return { edits: [] };
  }
  const builder = getTokenBuilder(document);
  builder.previousResult(params.previousResultId);
  buildTokens(builder, document);
  return builder.buildEdits();
});

connection.languages.semanticTokens.onRange((params) => {
  return { data: [] };
});

connection.listen();
