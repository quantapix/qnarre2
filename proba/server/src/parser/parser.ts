import debug from 'debug';
import { sync as globSync } from 'glob';
import isGlob from 'is-glob';
import semver from 'semver';
import * as ts from 'typescript';
import * as qp from './program';
import { getFirstSemanticOrSyntacticError } from './errors';
import * as qc from './convert';
import { convertTokens } from './utils';
import { visitorKeys } from './visitor-keys';

import { Program } from 'typescript';
import { TSESTree, TSNode, TSESTreeToTSNode, TSToken } from './ts-estree';

type DebugModule = 'typescript-eslint' | 'eslint' | 'typescript';

interface ParseOptions {
  comment?: boolean;
  debugLevel?: boolean | ('typescript-eslint' | 'eslint' | 'typescript')[];
  errorOnUnknownASTType?: boolean;
  filePath?: string;
  jsx?: boolean;
  loc?: boolean;
  loggerFn?: ((message: string) => void) | false;
  range?: boolean;
  tokens?: boolean;
  useJSXTextNode?: boolean;
}

interface ParseAndGenerateServicesOptions extends ParseOptions {
  errorOnTypeScriptSyntacticAndSemanticIssues?: boolean;
  extraFileExtensions?: string[];
  filePath?: string;
  preserveNodeMaps?: boolean;
  project?: string | string[];
  projectFolderIgnoreList?: (string | RegExp)[];
  tsconfigRootDir?: string;
  defaultProgram?: boolean;
}

export type TSESTreeOptions = ParseAndGenerateServicesOptions;

export interface ParserWeakMap<TKey, TValueBase> {
  get<TValue extends TValueBase>(key: TKey): TValue;
  has(key: unknown): boolean;
}

export interface ParserWeakMapESTreeToTSNode<TKey extends TSESTree.Node = TSESTree.Node> {
  get<TKeyBase extends TKey>(key: TKeyBase): TSESTreeToTSNode<TKeyBase>;
  has(key: unknown): boolean;
}

export interface ParserServices {
  program: Program;
  esTreeNodeToTSNodeMap: ParserWeakMapESTreeToTSNode;
  tsNodeToESTreeNodeMap: ParserWeakMap<TSNode | TSToken, TSESTree.Node>;
  hasFullTypeInformation: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isValidNode(x: any): x is TSESTree.Node {
  return x !== null && typeof x === 'object' && typeof x.type === 'string';
}

function getVisitorKeysForNode(
  allVisitorKeys: typeof visitorKeys,
  node: TSESTree.Node
): readonly string[] {
  const keys = allVisitorKeys[node.type];
  return keys ?? [];
}

interface SimpleTraverseOptions {
  enter: (node: TSESTree.Node, parent: TSESTree.Node | undefined) => void;
}

class SimpleTraverser {
  private allVisitorKeys = visitorKeys;
  private enter: SimpleTraverseOptions['enter'];

  constructor({ enter }: SimpleTraverseOptions) {
    this.enter = enter;
  }

  traverse(node: unknown, parent: TSESTree.Node | undefined): void {
    if (!isValidNode(node)) return;
    this.enter(node, parent);
    const keys = getVisitorKeysForNode(this.allVisitorKeys, node);
    if (keys.length < 1) return;
    for (const key of keys) {
      const childOrChildren = node[key as keyof TSESTree.Node];
      if (Array.isArray(childOrChildren)) {
        for (const child of childOrChildren) {
          this.traverse(child, node);
        }
      } else {
        this.traverse(childOrChildren, node);
      }
    }
  }
}

export function simpleTraverse(
  startingNode: TSESTree.Node,
  options: SimpleTraverseOptions
) {
  new SimpleTraverser(options).traverse(startingNode, undefined);
}

export function astConverter(
  ast: ts.SourceFile,
  extra: qp.Extra,
  shouldPreserveNodeMaps: boolean
): { estree: TSESTree.Program; astMaps: ASTMaps } {
  const parseDiagnostics = (ast as any).parseDiagnostics;
  if (parseDiagnostics.length) throw convertError(parseDiagnostics[0]);
  const instance = new Converter(ast, {
    errorOnUnknownASTType: extra.errorOnUnknownASTType || false,
    useJSXTextNode: extra.useJSXTextNode || false,
    shouldPreserveNodeMaps,
  });
  const estree = instance.convertProgram();
  if (!extra.range || !extra.loc) {
    simpleTraverse(estree, {
      enter: (n) => {
        if (!extra.range) delete n.range;
        if (!extra.loc) delete n.loc;
      },
    });
  }
  if (extra.tokens) estree.tokens = convertTokens(ast);
  if (extra.comment) estree.comments = convertComments(ast, extra.code);
  const astMaps = instance.getASTMaps();
  return { estree, astMaps };
}

const log = debug('typescript-eslint:typescript-estree:parser');

const SUPPORTED_TYPESCRIPT_VERSIONS = '>=3.3.1 <3.10.0';
const SUPPORTED_PRERELEASE_RANGES: string[] = [];
const ACTIVE_TYPESCRIPT_VERSION = ts.version;
const isRunningSupportedTypeScriptVersion = semver.satisfies(
  ACTIVE_TYPESCRIPT_VERSION,
  [SUPPORTED_TYPESCRIPT_VERSIONS].concat(SUPPORTED_PRERELEASE_RANGES).join(' || ')
);

let extra: qp.Extra;
let warnedAboutTSVersion = false;

function enforceString(code: unknown): string {
  if (typeof code !== 'string') return String(code);
  return code;
}

function getProgramAndAST(
  code: string,
  shouldProvideParserServices: boolean,
  shouldCreateDefaultProgram: boolean
): ASTAndProgram {
  return (
    (shouldProvideParserServices &&
      qp.projectProgram(code, shouldCreateDefaultProgram, extra)) ||
    (shouldProvideParserServices &&
      shouldCreateDefaultProgram &&
      qp.defaultProgram(code, extra)) ||
    qp.isolatedProgram(code, extra)
  );
}

function getFileName({ jsx }: { jsx?: boolean } = {}): string {
  return jsx ? 'estree.tsx' : 'estree.ts';
}

function resetExtra(): void {
  extra = {
    code: '',
    comment: false,
    comments: [],
    defaultProgram: false,
    debugLevel: new Set(),
    errorOnTypeScriptSyntacticAndSemanticIssues: false,
    errorOnUnknownASTType: false,
    extraFileExtensions: [],
    filePath: getFileName(),
    jsx: false,
    loc: false,
    log: console.log, // eslint-disable-line no-console
    preserveNodeMaps: true,
    projects: [],
    range: false,
    strict: false,
    tokens: null,
    tsconfigRootDir: process.cwd(),
    useJSXTextNode: false,
  };
}

function prepareAndTransformProjects(
  projectsInput: string | string[] | undefined,
  ignoreListInput: (string | RegExp)[] | undefined
): string[] {
  let projects: string[] = [];
  if (typeof projectsInput === 'string') {
    projects.push(projectsInput);
  } else if (Array.isArray(projectsInput)) {
    for (const project of projectsInput) {
      if (typeof project === 'string') {
        projects.push(project);
      }
    }
  }
  if (projects.length === 0) return projects;

  projects = projects.reduce<string[]>(
    (projects, project) =>
      projects.concat(
        isGlob(project)
          ? globSync(project, {
              cwd: extra.tsconfigRootDir,
            })
          : project
      ),
    []
  );
  const ignoreRegexes: RegExp[] = [];
  if (Array.isArray(ignoreListInput)) {
    for (const ignore of ignoreListInput) {
      if (ignore instanceof RegExp) {
        ignoreRegexes.push(ignore);
      } else if (typeof ignore === 'string') {
        ignoreRegexes.push(new RegExp(ignore));
      }
    }
  } else {
    ignoreRegexes.push(/\/node_modules\//);
  }
  const filtered = projects.filter((project) => {
    for (const ignore of ignoreRegexes) {
      if (ignore.test(project)) {
        return false;
      }
    }
    return true;
  });

  log('parserOptions.project matched projects: %s', projects);
  log('ignore list applied to parserOptions.project: %s', filtered);

  return filtered;
}

function applyParserOptionsToExtra(options: TSESTreeOptions): void {
  if (options.debugLevel === true) {
    extra.debugLevel = new Set(['typescript-eslint']);
  } else if (Array.isArray(options.debugLevel)) {
    extra.debugLevel = new Set(options.debugLevel);
  }
  if (extra.debugLevel.size > 0) {
    // debug doesn't support multiple `enable` calls, so have to do it all at once
    const namespaces = [];
    if (extra.debugLevel.has('typescript-eslint')) {
      namespaces.push('typescript-eslint:*');
    }
    if (
      extra.debugLevel.has('eslint') ||
      // make sure we don't turn off the eslint debug if it was enabled via --debug
      debug.enabled('eslint:*')
    ) {
      // https://github.com/eslint/eslint/blob/9dfc8501fb1956c90dc11e6377b4cb38a6bea65d/bin/eslint.js#L25
      namespaces.push('eslint:*,-eslint:code-path');
    }
    debug.enable(namespaces.join(','));
  }
  extra.range = typeof options.range === 'boolean' && options.range;
  extra.loc = typeof options.loc === 'boolean' && options.loc;
  if (typeof options.tokens === 'boolean' && options.tokens) {
    extra.tokens = [];
  }
  if (typeof options.comment === 'boolean' && options.comment) {
    extra.comment = true;
    extra.comments = [];
  }
  if (typeof options.jsx === 'boolean' && options.jsx) {
    extra.jsx = true;
  }
  if (typeof options.filePath === 'string' && options.filePath !== '<input>') {
    extra.filePath = options.filePath;
  } else {
    extra.filePath = getFileName(extra);
  }
  if (typeof options.useJSXTextNode === 'boolean' && options.useJSXTextNode) {
    extra.useJSXTextNode = true;
  }
  if (
    typeof options.errorOnUnknownASTType === 'boolean' &&
    options.errorOnUnknownASTType
  ) {
    extra.errorOnUnknownASTType = true;
  }
  if (typeof options.loggerFn === 'function') {
    extra.log = options.loggerFn;
  } else if (options.loggerFn === false) {
    extra.log = (): void => {};
  }
  if (typeof options.tsconfigRootDir === 'string') {
    extra.tsconfigRootDir = options.tsconfigRootDir;
  }
  extra.filePath = ensureAbsolutePath(extra.filePath, extra);
  extra.projects = prepareAndTransformProjects(
    options.project,
    options.projectFolderIgnoreList
  );
  if (
    Array.isArray(options.extraFileExtensions) &&
    options.extraFileExtensions.every((ext) => typeof ext === 'string')
  ) {
    extra.extraFileExtensions = options.extraFileExtensions;
  }
  if (typeof options.preserveNodeMaps === 'boolean') {
    extra.preserveNodeMaps = options.preserveNodeMaps;
  }
  extra.defaultProgram =
    typeof options.defaultProgram === 'boolean' && options.defaultProgram;
}

function warnAboutTSVersion(): void {
  if (!isRunningSupportedTypeScriptVersion && !warnedAboutTSVersion) {
    const isTTY = typeof process === undefined ? false : process.stdout?.isTTY;
    if (isTTY) {
      const border = '=============';
      const versionWarning = [
        border,
        'WARNING: You are currently running a version of TypeScript which is not officially supported by @typescript-eslint/typescript-estree.',
        'You may find that it works just fine, or you may not.',
        `SUPPORTED TYPESCRIPT VERSIONS: ${SUPPORTED_TYPESCRIPT_VERSIONS}`,
        `YOUR TYPESCRIPT VERSION: ${ACTIVE_TYPESCRIPT_VERSION}`,
        'Please only submit bug reports when using the officially supported version.',
        border,
      ];
      extra.log(versionWarning.join('\n\n'));
    }
    warnedAboutTSVersion = true;
  }
}

interface EmptyObject {}

type AST<T extends TSESTreeOptions> = TSESTree.Program &
  (T['tokens'] extends true ? { tokens: TSESTree.Token[] } : EmptyObject) &
  (T['comment'] extends true ? { comments: TSESTree.Comment[] } : EmptyObject);

interface ParseAndGenerateServicesResult<T extends TSESTreeOptions> {
  ast: AST<T>;
  services: ParserServices;
}

function parse<T extends TSESTreeOptions = TSESTreeOptions>(
  code: string,
  options?: T
): AST<T> {
  resetExtra();
  if (options?.errorOnTypeScriptSyntacticAndSemanticIssues) {
    throw new Error(
      `"errorOnTypeScriptSyntacticAndSemanticIssues" is only supported for parseAndGenerateServices()`
    );
  }
  code = enforceString(code);
  extra.code = code;
  if (typeof options !== 'undefined') {
    applyParserOptionsToExtra(options);
  }
  warnAboutTSVersion();
  const ast = qp.sourceFile(code, extra);
  const { estree } = astConverter(ast, extra, false);
  return estree as AST<T>;
}

function parseAndGenerateServices<T extends TSESTreeOptions = TSESTreeOptions>(
  code: string,
  options: T
): ParseAndGenerateServicesResult<T> {
  resetExtra();
  code = enforceString(code);
  extra.code = code;
  if (typeof options !== 'undefined') {
    applyParserOptionsToExtra(options);
    if (
      typeof options.errorOnTypeScriptSyntacticAndSemanticIssues === 'boolean' &&
      options.errorOnTypeScriptSyntacticAndSemanticIssues
    ) {
      extra.errorOnTypeScriptSyntacticAndSemanticIssues = true;
    }
  }
  warnAboutTSVersion();
  const shouldProvideParserServices = extra.projects && extra.projects.length > 0;
  const { ast, program } = getProgramAndAST(
    code,
    shouldProvideParserServices,
    extra.defaultProgram
  )!;
  const preserveNodeMaps =
    typeof extra.preserveNodeMaps === 'boolean' ? extra.preserveNodeMaps : true;
  const { estree, astMaps } = astConverter(ast, extra, preserveNodeMaps);

  if (program && extra.errorOnTypeScriptSyntacticAndSemanticIssues) {
    const error = getFirstSemanticOrSyntacticError(program, ast);
    if (error) {
      throw convertError(error);
    }
  }
  return {
    ast: estree as AST<T>,
    services: {
      hasFullTypeInformation: shouldProvideParserServices,
      program,
      esTreeNodeToTSNodeMap: astMaps.esTreeNodeToTSNodeMap,
      tsNodeToESTreeNodeMap: astMaps.tsNodeToESTreeNodeMap,
    },
  };
}

export { AST, parse, parseAndGenerateServices, ParseAndGenerateServicesResult };
