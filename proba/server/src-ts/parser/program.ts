/* eslint-disable @typescript-eslint/unbound-method */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import { TSESTree } from './ts-estree';
import { firstDefined } from './utils';

export function createSourceFile(s: string, e: Extra): ts.SourceFile {
  return ts.createSourceFile(
    e.filePath,
    s,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    scriptKind(e)
  );
}

function scriptKind(e: Extra, f: string = e.filePath): ts.ScriptKind {
  const x = path.extname(f).toLowerCase();
  switch (x) {
    case '.ts':
      return ts.ScriptKind.TS;
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.js':
      return ts.ScriptKind.JS;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.json':
      return ts.ScriptKind.JSON;
    default:
      return e.jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  }
}

interface ASTAndProgram {
  ast: ts.SourceFile;
  program: ts.Program;
}

export function createProjectProgram(
  s: string,
  defaulted: boolean,
  e: Extra
): ASTAndProgram | undefined {
  function extension(f?: string) {
    return f ? (f.endsWith('.d.ts') ? '.d.ts' : path.extname(f)) : undefined;
  }
  const r = firstDefined(programsForProjects(s, e.filePath, e), (p) => {
    const ast = p.getSourceFile(e.filePath);
    if (extension(e.filePath) !== extension(ast?.fileName)) return;
    return ast && { ast, program: p };
  });
  if (!r && !defaulted) {
    const es = [
      `The file does not match project: ${path.relative(
        e.cfgRootDir || process.cwd(),
        e.filePath
      )}.`,
    ];
    let err = false;
    const xs = e.extraFileExtensions || [];
    xs.forEach((x) => {
      if (!x.startsWith('.')) es.push(`Found unexpected extension "${x}"`);
      if (DEFAULT_EXTS.includes(x)) es.push(`Unnecessarily included extension "${x}"`);
    });
    const x = path.extname(e.filePath);
    if (!DEFAULT_EXTS.includes(x)) {
      const nx = `Extension for ${x} is non-standard`;
      if (xs.length > 0) {
        if (!xs.includes(x)) {
          es.push(`${nx}`);
          err = true;
        }
      } else {
        es.push(`${nx}`);
        err = true;
      }
    }
    if (!err) es.push('The file must be included in one project');
    throw new Error(es.join('\n'));
  }
  return r;
}

function programsForProjects(code: string, fIn: string, e: Extra): ts.Program[] {
  const f = canonicalPath(fIn);
  const results = [];
  currentState.code = code;
  currentState.filePath = f;
  const fileWatchCallbacks = fileWatchers.get(f);
  const codeHash = createHash(code);
  if (hashes.get(f) !== codeHash && fileWatchCallbacks && fileWatchCallbacks.size > 0) {
    fileWatchCallbacks.forEach((cb) => cb(f, ts.FileWatcherEventKind.Changed));
  }
  for (const rawTsconfigPath of e.projects) {
    const cfg = getTsconfigPath(rawTsconfigPath, e);
    const existingWatch = programs.get(cfg);
    if (!existingWatch) continue;
    let fileList = fileLists.get(cfg);
    let updatedProgram: ts.Program | null = null;
    if (!fileList) {
      updatedProgram = existingWatch.getProgram().getProgram();
      fileList = new Set(updatedProgram.getRootFileNames().map((f) => canonicalPath(f)));
      fileLists.set(cfg, fileList);
    }
    if (fileList.has(f)) {
      updatedProgram = updatedProgram ?? existingWatch.getProgram().getProgram();
      updatedProgram.getTypeChecker();
      return [updatedProgram];
    }
  }
  for (const rawTsconfigPath of e.projects) {
    const cfg = getTsconfigPath(rawTsconfigPath, e);
    const existingWatch = programs.get(cfg);
    if (existingWatch) {
      const updatedProgram = maybeInvalidateProgram(existingWatch, f, cfg);
      if (!updatedProgram) continue;
      updatedProgram.getTypeChecker();
      results.push(updatedProgram);
      continue;
    }
    const programWatch = createWatch(cfg, e);
    const program = programWatch.getProgram().getProgram();
    programs.set(cfg, programWatch);
    program.getTypeChecker();
    results.push(program);
  }
  return results;
}

export function createDefaultProgram(s: string, e: Extra): ASTAndProgram | undefined {
  if (!e.projects || e.projects.length !== 1) return;
  const c = ts.getParsedCommandLineOfConfigFile(
    getTsconfigPath(e.projects[0], e),
    createDefaultCompilerOptionsFromExtra(e),
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} }
  );
  if (!c) return;
  const h = ts.createCompilerHost(c.options, /* setParentNodes */ true);
  const old = h.readFile;
  h.readFile = (f: string) =>
    path.normalize(f) === path.normalize(e.filePath) ? s : old(f);
  const program = ts.createProgram([e.filePath], c.options, h);
  const ast = program.getSourceFile(e.filePath);
  return ast && { ast, program };
}

export function createIsolatedProgram(s: string, e: Extra): ASTAndProgram | undefined {
  const compilerHost: ts.CompilerHost = {
    fileExists() {
      return true;
    },
    getCanonicalFileName() {
      return e.filePath;
    },
    getCurrentDirectory() {
      return '';
    },
    getDirectories() {
      return [];
    },
    getDefaultLibFileName() {
      return 'lib.d.ts';
    },
    getNewLine() {
      return '\n';
    },
    getSourceFile(f: string) {
      return ts.createSourceFile(
        f,
        s,
        ts.ScriptTarget.Latest,
        /* setParentNodes */ true,
        scriptKind(e, f)
      );
    },
    readFile() {
      return undefined;
    },
    useCaseSensitiveFileNames() {
      return true;
    },
    writeFile() {
      return null;
    },
  };
  const program = ts.createProgram(
    [e.filePath],
    {
      noResolve: true,
      target: ts.ScriptTarget.Latest,
      jsx: e.jsx ? ts.JsxEmit.Preserve : undefined,
      ...createDefaultCompilerOptionsFromExtra(e),
    },
    compilerHost
  );
  const ast = program.getSourceFile(e.filePath);
  return ast && { ast, program };
}

const programs = new Map<CanonicalPath, ts.WatchOfConfigFile<ts.BuilderProgram>>();
const fileWatchers = new Map<CanonicalPath, Set<ts.FileWatcherCallback>>();
const dirWatchers = new Map<CanonicalPath, Set<ts.FileWatcherCallback>>();
const fileLists = new Map<CanonicalPath, Set<CanonicalPath>>();
const timestamps = new Map<CanonicalPath, number>();
const hashes = new Map<CanonicalPath, string>();

export function clearCaches() {
  programs.clear();
  fileWatchers.clear();
  dirWatchers.clear();
  hashes.clear();
  fileLists.clear();
  timestamps.clear();
}

const DEFAULT_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

interface DirectoryStructureHost {
  readDirectory?(
    path: string,
    extensions?: ReadonlyArray<string>,
    exclude?: ReadonlyArray<string>,
    include?: ReadonlyArray<string>,
    depth?: number
  ): string[];
}

interface CachedDirectoryStructureHost extends DirectoryStructureHost {
  readDirectory(
    path: string,
    extensions?: ReadonlyArray<string>,
    exclude?: ReadonlyArray<string>,
    include?: ReadonlyArray<string>,
    depth?: number
  ): string[];
}

interface WatchCompilerHostOfConfigFile<T extends ts.BuilderProgram>
  extends ts.WatchCompilerHostOfConfigFile<T> {
  onCachedDirectoryStructureHostCreate(_: CachedDirectoryStructureHost): void;
  extraFileExtensions?: readonly ts.FileExtensionInfo[];
}

interface Extra {
  code: string;
  comment: boolean;
  comments: TSESTree.Comment[];
  createDefaultProgram: boolean;
  debugLevel: Set<unknown>;
  errorOnTypeScriptSyntacticAndSemanticIssues: boolean;
  errorOnUnknownASTType: boolean;
  extraFileExtensions: string[];
  filePath: string;
  jsx: boolean;
  loc: boolean;
  log: (message: string) => void;
  preserveNodeMaps?: boolean;
  projects: string[];
  range: boolean;
  strict: boolean;
  tokens: null | TSESTree.Token[];
  cfgRootDir: string;
  useJSXTextNode: boolean;
}

function saveWatchCallback(ws: Map<string, Set<ts.FileWatcherCallback>>) {
  return (p: string, cb: ts.FileWatcherCallback): ts.FileWatcher => {
    const f = canonicalPath(p);
    const s = ((): Set<ts.FileWatcherCallback> => {
      let s = ws.get(f);
      if (!s) {
        s = new Set();
        ws.set(f, s);
      }
      return s;
    })();
    s.add(cb);
    return {
      close: (): void => {
        s.delete(cb);
      },
    };
  };
}

const currentState: { code: string; filePath: CanonicalPath } = {
  code: '',
  filePath: '' as CanonicalPath,
};

function reporter(d: ts.Diagnostic) {
  throw new Error(ts.flattenDiagnosticMessageText(d.messageText, ts.sys.newLine));
}

function createHash(s: string) {
  return ts.sys?.createHash ? ts.sys.createHash(s) : s;
}

function createWatch(cfg: string, e: Extra): ts.WatchOfConfigFile<ts.BuilderProgram> {
  const h = ts.createWatchCompilerHost(
    cfg,
    createDefaultCompilerOptionsFromExtra(e),
    ts.sys,
    ts.createAbstractBuilder,
    reporter,
    /*reportWatchStatus*/ () => {}
  ) as WatchCompilerHostOfConfigFile<ts.BuilderProgram>;
  const old = h.readFile;
  h.readFile = (p, encoding): string | undefined => {
    const f = canonicalPath(p);
    const t = f === currentState.filePath ? currentState.code : old(f, encoding);
    if (t !== undefined) hashes.set(f, createHash(t));
    return t;
  };
  h.onUnRecoverableConfigFileDiagnostic = reporter;
  h.afterProgramCreate = (p) => {
    const ds = p
      .getConfigFileParsingDiagnostics()
      .filter((d) => d.category === ts.DiagnosticCategory.Error && d.code !== 18003);
    if (ds.length > 0) reporter(ds[0]);
  };
  h.watchFile = saveWatchCallback(fileWatchers);
  h.watchDirectory = saveWatchCallback(dirWatchers);
  const old2 = h.onCachedDirectoryStructureHostCreate;
  h.onCachedDirectoryStructureHostCreate = (host) => {
    const old3 = host.readDirectory;
    host.readDirectory = (path, exts, exclude, include, depth): string[] =>
      old3(
        path,
        !exts ? undefined : exts.concat(e.extraFileExtensions),
        exclude,
        include,
        depth
      );
    old2(host);
  };
  h.extraFileExtensions = e.extraFileExtensions.map((extension) => ({
    extension,
    isMixedContent: true,
    scriptKind: ts.ScriptKind.Deferred,
  }));
  h.trace = log;
  h.setTimeout = undefined;
  h.clearTimeout = undefined;
  return ts.createWatchProgram(h);
}

function hasChanged(p: CanonicalPath) {
  const s = fs.statSync(p);
  const last = s.mtimeMs;
  const t = timestamps.get(p);
  timestamps.set(p, last);
  if (t === undefined) return false;
  return Math.abs(t - last) > Number.EPSILON;
}

function maybeInvalidateProgram(
  w: ts.WatchOfConfigFile<ts.BuilderProgram>,
  f: CanonicalPath,
  cfg: CanonicalPath
): ts.Program | undefined {
  let r = w.getProgram().getProgram();
  if (process.env.TSESTREE_NO_INVALIDATION === 'true') return r;
  if (hasChanged(cfg)) {
    fileWatchers.get(cfg)?.forEach((w) => w(cfg, ts.FileWatcherEventKind.Changed));
    fileLists.delete(cfg);
  }
  let s = r.getSourceFile(f);
  if (s) return r;
  const d = canonicalDirname(f);
  let p: CanonicalPath | undefined;
  let n = d;
  let hasCallback = false;
  while (p !== n) {
    p = n;
    const ws = dirWatchers.get(p);
    if (ws) {
      ws.forEach((w) => {
        if (d !== p) w(d, ts.FileWatcherEventKind.Changed);
        w(p!, ts.FileWatcherEventKind.Changed);
      });
      hasCallback = true;
    }
    n = canonicalDirname(p);
  }
  if (!hasCallback) return;
  fileLists.delete(cfg);
  r = w.getProgram().getProgram();
  s = r.getSourceFile(f);
  if (s) return r;
  const rs = r.getRootFileNames();
  const deletedFile = rs.find((f) => !fs.existsSync(f));
  if (!deletedFile) return;
  const ws = fileWatchers.get(canonicalPath(deletedFile));
  if (!ws) return r;
  ws.forEach((w) => w(deletedFile, ts.FileWatcherEventKind.Deleted));
  fileLists.delete(cfg);
  r = w.getProgram().getProgram();
  s = r.getSourceFile(f);
  if (s) return r;
  return;
}

const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
  allowNonTsExtensions: true,
  allowJs: true,
  checkJs: true,
  noEmit: true,
  // extendedDiagnostics: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
};

function createDefaultCompilerOptionsFromExtra(e: Extra): ts.CompilerOptions {
  if (e.debugLevel.has('typescript')) {
    return {
      ...DEFAULT_COMPILER_OPTIONS,
      extendedDiagnostics: true,
    };
  }
  return DEFAULT_COMPILER_OPTIONS;
}

type CanonicalPath = string & { __brand: unknown };

const correctCasing =
  ts.sys?.useCaseSensitiveFileNames ?? true
    ? (f: string): string => f
    : (f: string): string => f.toLowerCase();

function canonicalPath(f: string): CanonicalPath {
  let n = path.normalize(f);
  if (n.endsWith(path.sep)) n = n.substr(0, n.length - 1);
  return correctCasing(n) as CanonicalPath;
}

function ensureAbsolutePath(p: string, e: Extra): string {
  return path.isAbsolute(p) ? p : path.join(e.cfgRootDir || process.cwd(), p);
}

function getTsconfigPath(p: string, e: Extra): CanonicalPath {
  return canonicalPath(ensureAbsolutePath(p, e));
}

function canonicalDirname(p: CanonicalPath): CanonicalPath {
  return path.dirname(p) as CanonicalPath;
}
