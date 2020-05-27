/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import * as qfs from 'fs';
import * as qpath from 'path';
import * as qts from 'typescript';

function compile(fs: string[], opts: qts.CompilerOptions) {
  console.log(`filenames ${fs}`);

  const createdFiles = {} as { [k: string]: string };
  const h = qts.createCompilerHost(opts);
  h.writeFile = (f: string, d: string) => (createdFiles[f] = d);

  const p = qts.createProgram(fs, opts, h);
  const r = p.emit();
  console.log(`results: ${r}`);

  fs.forEach((f) => {
    console.log('### JavaScript\n');
    console.log(h.readFile(f));
    console.log('### Type Definition\n');
    const n = f.replace('.js', '.d.ts');
    console.log(createdFiles[n]);
  });

  const ds = qts.getPreEmitDiagnostics(p).concat(r.diagnostics);
  ds.forEach((d) => {
    if (d.file) {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start!);
      const m = qts.flattenDiagnosticMessageText(d.messageText, '\n');
      console.log(`${d.file.fileName} (${line + 1},${character + 1}): ${m}`);
    } else {
      console.log(qts.flattenDiagnosticMessageText(d.messageText, '\n'));
    }
  });

  const x = r.emitSkipped ? 1 : 0;
  console.log(`Process exiting with code '${x}'.`);
  process.exit(x);
}

compile(process.argv.slice(2), {
  noEmitOnError: true,
  noImplicitAny: true,
  target: qts.ScriptTarget.ES5,
  module: qts.ModuleKind.CommonJS,
  declaration: true,
  emitDeclarationOnly: true,
});

function xform() {
  const s = "let x: string  = 'string'";
  const r = qts.transpileModule(s, { compilerOptions: { module: qts.ModuleKind.CommonJS } });
  console.log(JSON.stringify(r));
}
xform();

function extract(file: string, identifiers: string[]) {
  const p = qts.createProgram([file], { allowJs: true });
  const s = p.getSourceFile(file);
  if (!s) return;
  const printer = qts.createPrinter({ newLine: qts.NewLineKind.LineFeed });

  const unfounds: [string, qts.Node][] = [];
  const founds: [string, qts.Node][] = [];

  qts.forEachChild(s, (n) => {
    let name = '';
    if (qts.isFunctionDeclaration(n)) {
      name = n.name?.text ?? name;
      n.body = undefined;
    } else if (qts.isVariableStatement(n)) {
      name = n.declarationList.declarations[0].name.getText(s);
    } else if (qts.isInterfaceDeclaration(n)) {
      name = n.name.text;
    }
    const container = identifiers.includes(name) ? founds : unfounds;
    container.push([name, n]);
  });

  if (!founds.length) {
    console.log(
      `Could not find any of ${identifiers.join(', ')} in ${file}, found: ${unfounds
        .filter((e) => e[0])
        .map((e) => e[0])
        .join(', ')}.`
    );
    process.exitCode = 1;
  } else {
    founds.map((e) => {
      const [name, n] = e;
      console.log('### ' + name + '\n');
      console.log(printer.printNode(qts.EmitHint.Unspecified, n, s)) + '\n';
    });
  }
}

extract(process.argv[2], process.argv.slice(3));

function delint(src: qts.SourceFile) {
  delintNode(src);

  function delintNode(n: qts.Node) {
    switch (n.kind) {
      case qts.SyntaxKind.ForStatement:
      case qts.SyntaxKind.ForInStatement:
      case qts.SyntaxKind.WhileStatement:
      case qts.SyntaxKind.DoStatement:
        if ((n as qts.IterationStatement).statement.kind !== qts.SyntaxKind.Block) {
          report(n, 'contents should be wrapped in a block body');
        }
        break;
      case qts.SyntaxKind.IfStatement:
        const n2 = n as qts.IfStatement;
        if (n2.thenStatement.kind !== qts.SyntaxKind.Block) {
          report(n2.thenStatement, 'contents should be wrapped in a block body');
        }
        if (n2.elseStatement && n2.elseStatement.kind !== qts.SyntaxKind.Block && n2.elseStatement.kind !== qts.SyntaxKind.IfStatement) {
          report(n2.elseStatement, 'contents should be wrapped in a block body');
        }
        break;
      case qts.SyntaxKind.BinaryExpression:
        const op = (n as qts.BinaryExpression).operatorToken.kind;
        if (op === qts.SyntaxKind.EqualsEqualsToken || op === qts.SyntaxKind.ExclamationEqualsToken) {
          report(n, "Use '===' and '!=='.");
        }
        break;
    }
    qts.forEachChild(n, delintNode);
  }

  function report(n: qts.Node, m: string) {
    const { line, character } = src.getLineAndCharacterOfPosition(n.getStart());
    console.log(`${src.fileName} (${line + 1},${character + 1}): ${m}`);
  }
}

const fs = process.argv.slice(2);
fs.forEach((f) => {
  const s = qts.createSourceFile(f, qfs.readFileSync(f).toString(), qts.ScriptTarget.ES2015, /*setParentNodes */ true);
  delint(s);
});

const formatHost: qts.FormatDiagnosticsHost = {
  getCanonicalFileName: (p) => p,
  getCurrentDirectory: qts.sys.getCurrentDirectory,
  getNewLine: () => qts.sys.newLine,
};

function watchMain() {
  const cfg = qts.findConfigFile(/*searchPath*/ './', qts.sys.fileExists, 'tsconfig.json');
  if (!cfg) {
    throw new Error("Could not find a valid 'tsconfig.json'.");
  }
  const create = qts.createSemanticDiagnosticsBuilderProgram;
  const h = qts.createWatchCompilerHost(cfg, {}, qts.sys, create, error, info);

  const origCreate = h.createProgram;
  h.createProgram = (roots: ReadonlyArray<string> | undefined, opts, host, old) => {
    console.log('** About to create program **');
    return origCreate(roots, opts, host, old);
  };
  const origAfter = h.afterProgramCreate;
  h.afterProgramCreate = (p) => {
    console.log('** Finished creating program **');
    origAfter!(p);
  };
  qts.createWatchProgram(h);
}

function error(d: qts.Diagnostic) {
  console.error('Error', d.code, ':', qts.flattenDiagnosticMessageText(d.messageText, formatHost.getNewLine()));
}

function info(d: qts.Diagnostic) {
  console.info(qts.formatDiagnostic(d, formatHost));
}

watchMain();

function watch(roots: string[], opts: qts.CompilerOptions) {
  const fs: qts.MapLike<{ version: number }> = {};
  roots.forEach((f) => {
    fs[f] = { version: 0 };
  });
  const h: qts.LanguageServiceHost = {
    getScriptFileNames: () => roots,
    getScriptVersion: (f) => fs[f] && fs[f].version.toString(),
    getScriptSnapshot: (f) => {
      if (!qfs.existsSync(f)) return undefined;
      return qts.ScriptSnapshot.fromString(qfs.readFileSync(f).toString());
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => opts,
    getDefaultLibFileName: (os) => qts.getDefaultLibFilePath(os),
    fileExists: qts.sys.fileExists,
    readFile: qts.sys.readFile,
    readDirectory: qts.sys.readDirectory,
  };
  const ss = qts.createLanguageService(h, qts.createDocumentRegistry());
  roots.forEach((f) => {
    emit(f);
    qfs.watchFile(f, { persistent: true, interval: 250 }, (s, prev) => {
      if (+s.mtime <= +prev.mtime) return;
      fs[f].version++;
      emit(f);
    });
  });

  function emit(f: string) {
    const out = ss.getEmitOutput(f);
    if (!out.emitSkipped) console.log(`Emitting ${f}`);
    else {
      console.log(`Emitting ${f} failed`);
      log(f);
    }
    out.outputFiles.forEach((o) => {
      qfs.writeFileSync(o.name, o.text, 'utf8');
    });
  }

  function log(f: string) {
    const ds = ss.getCompilerOptionsDiagnostics().concat(ss.getSyntacticDiagnostics(f)).concat(ss.getSemanticDiagnostics(f));
    ds.forEach((d) => {
      const message = qts.flattenDiagnosticMessageText(d.messageText, '\n');
      if (d.file) {
        const { line, character } = d.file.getLineAndCharacterOfPosition(d.start!);
        console.log(`  Error ${d.file.fileName} (${line + 1},${character + 1}): ${message}`);
      } else {
        console.log(`  Error: ${message}`);
      }
    });
  }
}

const fs2 = qfs.readdirSync(process.cwd()).filter((f) => f.length >= 3 && f.substr(f.length - 3, 3) === '.ts');
watch(fs2, { module: qts.ModuleKind.CommonJS });

function createCompilerHost(opts: qts.CompilerOptions, locs: string[]): qts.CompilerHost {
  return {
    getSourceFile,
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: (f, content) => qts.sys.writeFile(f, content),
    getCurrentDirectory: () => qts.sys.getCurrentDirectory(),
    getDirectories: (path) => qts.sys.getDirectories(path),
    getCanonicalFileName: (f) => (qts.sys.useCaseSensitiveFileNames ? f : f.toLowerCase()),
    getNewLine: () => qts.sys.newLine,
    useCaseSensitiveFileNames: () => qts.sys.useCaseSensitiveFileNames,
    fileExists,
    readFile,
    resolveModuleNames,
  };

  function getSourceFile(f: string, v: qts.ScriptTarget, _onError?: (_: string) => void) {
    const t = qts.sys.readFile(f);
    return t !== undefined ? qts.createSourceFile(f, t, v) : undefined;
  }

  function fileExists(f: string) {
    return qts.sys.fileExists(f);
  }

  function readFile(f: string): string | undefined {
    return qts.sys.readFile(f);
  }

  function resolveModuleNames(ms: string[], f: string): qts.ResolvedModule[] {
    const rs: qts.ResolvedModule[] = [];
    for (const m of ms) {
      const r = qts.resolveModuleName(m, f, opts, {
        fileExists,
        readFile,
      });
      if (r.resolvedModule) rs.push(r.resolvedModule);
      else {
        for (const l of locs) {
          const p = qpath.join(l, m + '.d.ts');
          if (fileExists(p)) rs.push({ resolvedFileName: p });
        }
      }
    }
    return rs;
  }
}

function compile2(sourceFiles: string[], moduleSearchLocations: string[]): void {
  const options: qts.CompilerOptions = {
    module: qts.ModuleKind.AMD,
    target: qts.ScriptTarget.ES5,
  };
  const host = createCompilerHost(options, moduleSearchLocations);
  const p = qts.createProgram(sourceFiles, options, host);
  p.emit();
}

compile2(process.argv.slice(2), []);

function makeFactorialFunction() {
  const functionName = qts.createIdentifier('factorial');
  const paramName = qts.createIdentifier('n');
  const parameter = qts.createParameter(/*decorators*/ undefined, /*modifiers*/ undefined, /*dotDotDotToken*/ undefined, paramName);

  const condition = qts.createBinary(paramName, qts.SyntaxKind.LessThanEqualsToken, qts.createLiteral(1));
  const ifBody = qts.createBlock([qts.createReturn(qts.createLiteral(1))], /*multiline*/ true);

  const decrementedArg = qts.createBinary(paramName, qts.SyntaxKind.MinusToken, qts.createLiteral(1));
  const recurse = qts.createBinary(paramName, qts.SyntaxKind.AsteriskToken, qts.createCall(functionName, /*typeArgs*/ undefined, [decrementedArg]));
  const statements = [qts.createIf(condition, ifBody), qts.createReturn(recurse)];

  return qts.createFunctionDeclaration(/*decorators*/ undefined, /*modifiers*/ [qts.createToken(qts.SyntaxKind.ExportKeyword)], /*asteriskToken*/ undefined, functionName, /*typeParameters*/ undefined, [parameter], /*returnType*/ qts.createKeywordTypeNode(qts.SyntaxKind.NumberKeyword), qts.createBlock(statements, /*multiline*/ true));
}

const resultFile = qts.createSourceFile('someFileName.ts', '', qts.ScriptTarget.Latest, /*setParentNodes*/ false, qts.ScriptKind.TS);
const printer = qts.createPrinter({ newLine: qts.NewLineKind.LineFeed });

const result = printer.printNode(qts.EmitHint.Unspecified, makeFactorialFunction(), resultFile);
console.log(result);

interface DocEntry {
  name?: string;
  fileName?: string;
  documentation?: string;
  type?: string;
  constructors?: DocEntry[];
  parameters?: DocEntry[];
  returnType?: string;
}

function generateDocumentation(fs: string[], options: qts.CompilerOptions): void {
  const p = qts.createProgram(fs, options);
  const checker = p.getTypeChecker();
  const out: DocEntry[] = [];
  for (const s of p.getSourceFiles()) {
    if (!s.isDeclarationFile) qts.forEachChild(s, visit);
  }
  qfs.writeFileSync('classes.json', JSON.stringify(out, undefined, 4));
  return;
  function visit(n: qts.Node) {
    if (!isNodeExported(n)) return;
    if (qts.isClassDeclaration(n) && n.name) {
      const s = checker.getSymbolAtLocation(n.name);
      if (s) out.push(serializeClass(s));
    } else if (qts.isModuleDeclaration(n)) qts.forEachChild(n, visit);
  }

  function serializeSymbol(s: qts.Symbol): DocEntry {
    return {
      name: s.getName(),
      documentation: qts.displayPartsToString(s.getDocumentationComment(checker)),
      type: checker.typeToString(checker.getTypeOfSymbolAtLocation(s, s.valueDeclaration)),
    };
  }

  function serializeClass(s: qts.Symbol) {
    const details = serializeSymbol(s);
    const constructorType = checker.getTypeOfSymbolAtLocation(s, s.valueDeclaration);
    details.constructors = constructorType.getConstructSignatures().map(serializeSignature);
    return details;
  }

  function serializeSignature(s: qts.Signature) {
    return {
      parameters: s.parameters.map(serializeSymbol),
      returnType: checker.typeToString(s.getReturnType()),
      documentation: qts.displayPartsToString(s.getDocumentationComment(checker)),
    };
  }

  function isNodeExported(n: qts.Node): boolean {
    return (qts.getCombinedModifierFlags(n as qts.Declaration) & qts.ModifierFlags.Export) !== 0 || (!!n.parent && n.parent.kind === qts.SyntaxKind.SourceFile);
  }
}

generateDocumentation(process.argv.slice(2), {
  target: qts.ScriptTarget.ES5,
  module: qts.ModuleKind.CommonJS,
});
