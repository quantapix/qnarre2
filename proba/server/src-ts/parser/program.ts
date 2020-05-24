/* eslint-disable @typescript-eslint/unbound-method */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

import { TSESTree } from './ts-estree';
import { firstDefined } from './utils';

export interface Extra {
  code: string;
  comment: boolean;
  comments: TSESTree.Comment[];
  defaultProgram: boolean;
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

export function sourceFile(s: string, e: Extra): ts.SourceFile {
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

export function projectProgram(
  s: string,
  defaulted: boolean,
  e: Extra
): ASTAndProgram | undefined {
  function extension(f?: string) {
    return f ? (f.endsWith('.d.ts') ? '.d.ts' : path.extname(f)) : undefined;
  }
  const r = firstDefined(programsFor(s, e.filePath, e), (p) => {
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

const programs = new Map<CanonicalPath, ts.WatchOfConfigFile<ts.BuilderProgram>>();
const fileWatchers = new Map<CanonicalPath, Set<ts.FileWatcherCallback>>();
const dirWatchers = new Map<CanonicalPath, Set<ts.FileWatcherCallback>>();
const fileLists = new Map<CanonicalPath, Set<CanonicalPath>>();
const timestamps = new Map<CanonicalPath, number>();
const hashes = new Map<CanonicalPath, string>();

const currentState: { code: string; filePath: CanonicalPath } = {
  code: '',
  filePath: '' as CanonicalPath,
};

function programsFor(s: string, fIn: string, e: Extra): ts.Program[] {
  const f = canonicalPath(fIn);
  currentState.code = s;
  currentState.filePath = f;
  const ws = fileWatchers.get(f);
  if (hashes.get(f) !== createHash(s) && ws?.size > 0) {
    ws.forEach((w) => w(f, ts.FileWatcherEventKind.Changed));
  }
  for (const c of e.projects) {
    const cfg = configPath(c, e);
    const w = programs.get(cfg);
    if (!w) continue;
    let fs = fileLists.get(cfg);
    let p: ts.Program | undefined;
    if (!fs) {
      p = w.getProgram().getProgram();
      fs = new Set(p.getRootFileNames().map((f) => canonicalPath(f)));
      fileLists.set(cfg, fs);
    }
    if (fs.has(f)) {
      p = p ?? w.getProgram().getProgram();
      p.getTypeChecker();
      return [p];
    }
  }
  const ps = [];
  for (const c of e.projects) {
    const cfg = configPath(c, e);
    let w = programs.get(cfg);
    if (w) {
      const p = maybeInvalidate(w, f, cfg);
      if (!p) continue;
      p.getTypeChecker();
      ps.push(p);
      continue;
    }
    w = createWatch(cfg, e);
    const p = w.getProgram().getProgram();
    programs.set(cfg, w);
    p.getTypeChecker();
    ps.push(p);
  }
  return ps;
}

export function defaultProgram(s: string, e: Extra): ASTAndProgram | undefined {
  if (!e.projects || e.projects.length !== 1) return;
  const c = ts.getParsedCommandLineOfConfigFile(
    configPath(e.projects[0], e),
    optionsFrom(e),
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

export function isolatedProgram(s: string, e: Extra): ASTAndProgram | undefined {
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
      ...optionsFrom(e),
    },
    compilerHost
  );
  const ast = program.getSourceFile(e.filePath);
  return ast && { ast, program };
}

export function clearCaches() {
  programs.clear();
  fileWatchers.clear();
  dirWatchers.clear();
  hashes.clear();
  fileLists.clear();
  timestamps.clear();
}

const DEFAULT_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

type CanonicalPath = string & { __brand: unknown };

const correctCasing =
  ts.sys?.useCaseSensitiveFileNames ?? true
    ? (f: string): string => f
    : (f: string): string => f.toLowerCase();

function canonicalPath(f: string) {
  let n = path.normalize(f);
  if (n.endsWith(path.sep)) n = n.substr(0, n.length - 1);
  return correctCasing(n) as CanonicalPath;
}

function configPath(p: string, e: Extra) {
  p = path.isAbsolute(p) ? p : path.join(e.cfgRootDir || process.cwd(), p);
  return canonicalPath(p);
}

function createHash(s: string) {
  return ts.sys?.createHash ? ts.sys.createHash(s) : s;
}

function maybeInvalidate(
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
  const d = canonicalDir(f);
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
    n = canonicalDir(p);
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

function hasChanged(p: CanonicalPath) {
  const s = fs.statSync(p);
  const last = s.mtimeMs;
  const t = timestamps.get(p);
  timestamps.set(p, last);
  if (t === undefined) return false;
  return Math.abs(t - last) > Number.EPSILON;
}

function canonicalDir(p: CanonicalPath): CanonicalPath {
  return path.dirname(p) as CanonicalPath;
}

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

function createWatch(cfg: string, e: Extra): ts.WatchOfConfigFile<ts.BuilderProgram> {
  const h = ts.createWatchCompilerHost(
    cfg,
    optionsFrom(e),
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
  //h.trace = debug('qnarre:server:parser');;
  h.setTimeout = undefined;
  h.clearTimeout = undefined;
  return ts.createWatchProgram(h);
}

function reporter(d: ts.Diagnostic) {
  throw new Error(ts.flattenDiagnosticMessageText(d.messageText, ts.sys.newLine));
}

const DEFAULT_OPTS: ts.CompilerOptions = {
  allowNonTsExtensions: true,
  allowJs: true,
  checkJs: true,
  noEmit: true,
  // extendedDiagnostics: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
};

function optionsFrom(e: Extra): ts.CompilerOptions {
  if (e.debugLevel.has('typescript')) {
    return {
      ...DEFAULT_OPTS,
      extendedDiagnostics: true,
    };
  }
  return DEFAULT_OPTS;
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
