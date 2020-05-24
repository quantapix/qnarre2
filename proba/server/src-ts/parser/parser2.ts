import { TSESLint } from './xutils';
import {
  parseAndGenerateServices,
  ParserServices,
  TSESTreeOptions,
  TSESTree,
  visitorKeys,
} from '.';
import { analyzeScope } from './analyze';

type ParserOptions = TSESLint.ParserOptions;

interface ParseForESLintResult {
  ast: TSESTree.Program & {
    range?: [number, number];
    tokens?: TSESTree.Token[];
    comments?: TSESTree.Comment[];
  };
  services: ParserServices;
  visitorKeys: typeof visitorKeys;
  scopeManager: ReturnType<typeof analyzeScope>;
}

function validateBoolean(value: boolean | undefined, fallback = false): boolean {
  if (typeof value !== 'boolean') return fallback;
  return value;
}

export function parse(
  code: string,
  options?: ParserOptions
): ParseForESLintResult['ast'] {
  return parseForESLint(code, options).ast;
}

export function parseForESLint(
  code: string,
  options?: ParserOptions | null
): ParseForESLintResult {
  if (!options || typeof options !== 'object') options = {};

  if (options.sourceType !== 'module' && options.sourceType !== 'script') {
    options.sourceType = 'script';
  }
  if (typeof options.ecmaFeatures !== 'object') options.ecmaFeatures = {};

  const parserOptions: TSESTreeOptions = {};
  Object.assign(parserOptions, options, {
    useJSXTextNode: validateBoolean(options.useJSXTextNode, true),
    jsx: validateBoolean(options.ecmaFeatures.jsx),
  });

  if (typeof options.filePath === 'string') {
    const tsx = options.filePath.endsWith('.tsx');
    if (tsx || options.filePath.endsWith('.ts')) {
      parserOptions.jsx = tsx;
    }
  }
  const warnOnUnsupportedTypeScriptVersion = validateBoolean(
    options.warnOnUnsupportedTypeScriptVersion,
    true
  );
  if (!warnOnUnsupportedTypeScriptVersion) parserOptions.loggerFn = false;

  const { ast, services } = parseAndGenerateServices(code, parserOptions);
  ast.sourceType = options.sourceType;
  const scopeManager = analyzeScope(ast, options);
  return { ast, services, scopeManager, visitorKeys };
}
