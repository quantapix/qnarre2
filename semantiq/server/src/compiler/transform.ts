import { Node } from './types';
import { qf } from './core';
import { Syntax } from './syntax';
import * as qc from './core';
import * as qd from './diags';
import * as qt from './types';
import * as qu from './utils';
import * as qy from './syntax';
export const nullTrafoContext: qt.TrafoContext = {
  enableEmitNotification: qu.noop,
  enableSubstitution: qu.noop,
  endLexicalEnvironment: () => undefined,
  getCompilerOpts: () => ({}),
  getEmitHost: qu.notImplemented,
  getEmitResolver: qu.notImplemented,
  setLexicalEnvironmentFlags: qu.noop,
  getLexicalEnvironmentFlags: () => 0,
  hoistFunctionDeclaration: qu.noop,
  hoistVariableDeclaration: qu.noop,
  addInitializationStatement: qu.noop,
  isEmitNotificationEnabled: qu.notImplemented,
  isSubstitutionEnabled: qu.notImplemented,
  onEmitNode: qu.noop,
  onSubstituteNode: qu.notImplemented,
  readEmitHelpers: qu.notImplemented,
  requestEmitHelper: qu.noop,
  resumeLexicalEnvironment: qu.noop,
  startLexicalEnvironment: qu.noop,
  suspendLexicalEnvironment: qu.noop,
  addDiagnostic: qu.noop,
};
export interface TransformationResult<T extends Node> {
  transformed: T[];
  diagnostics?: DiagnosticWithLocation[];
  substituteNode(hint: qt.EmitHint, node: Node): Node;
  emitNodeWithNotification(hint: qt.EmitHint, node: Node, emitCallback: (hint: qt.EmitHint, node: Node) => void): void;
  isEmitNotificationEnabled?(node: Node): boolean;
  dispose(): void;
}
export type Transformer<T extends Node> = (node: T) => T;
export type TransformerFactory<T extends Node> = (c: qt.TrafoContext) => Transformer<T>;
function getModuleTransformer(moduleKind: ModuleKind): TransformerFactory<SourceFile | Bundle> {
  switch (moduleKind) {
    case qt.ModuleKind.ESNext:
    case qt.ModuleKind.ES2020:
    case qt.ModuleKind.ES2015:
      return transformECMAScriptModule;
    case qt.ModuleKind.System:
      return transformSystemModule;
    default:
      return transformModule;
  }
}
const enum TransformationState {
  Uninitialized,
  Initialized,
  Completed,
  Disposed,
}
const enum SyntaxKindFeatureFlags {
  Substitution = 1 << 0,
  EmitNotifications = 1 << 1,
}
export const noTransformers: EmitTransformers = { scriptTransformers: emptyArray, declarationTransformers: emptyArray };
export function getTransformers(compilerOpts: CompilerOpts, customTransformers?: CustomTransformers, emitOnlyDtsFiles?: boolean): EmitTransformers {
  return {
    scriptTransformers: getScriptTransformers(compilerOpts, customTransformers, emitOnlyDtsFiles),
    declarationTransformers: getDeclarationTransformers(customTransformers),
  };
}
function getScriptTransformers(compilerOpts: CompilerOpts, customTransformers?: CustomTransformers, emitOnlyDtsFiles?: boolean) {
  if (emitOnlyDtsFiles) return emptyArray;
  const jsx = compilerOpts.jsx;
  const languageVersion = getEmitScriptTarget(compilerOpts);
  const moduleKind = getEmitModuleKind(compilerOpts);
  const transformers: TransformerFactory<SourceFile | Bundle>[] = [];
  qu.addRange(transformers, customTransformers && qu.map(customTransformers.before, wrapScriptTransformerFactory));
  transformers.push(transformTypeScript);
  transformers.push(transformClassFields);
  if (jsx === JsxEmit.React) transformers.push(transformJsx);
  if (languageVersion < ScriptTarget.ESNext) transformers.push(transformESNext);
  if (languageVersion < ScriptTarget.ES2020) transformers.push(transformES2020);
  transformers.push(getModuleTransformer(moduleKind));
  qu.addRange(transformers, customTransformers && qu.map(customTransformers.after, wrapScriptTransformerFactory));
  return transformers;
}
function getDeclarationTransformers(customTransformers?: CustomTransformers) {
  const transformers: TransformerFactory<SourceFile | Bundle>[] = [];
  transformers.push(transformDeclarations);
  qu.addRange(transformers, customTransformers && qu.map(customTransformers.afterDeclarations, wrapDeclarationTransformerFactory));
  return transformers;
}
function wrapCustomTransformer(transformer: CustomTransformer): Transformer<Bundle | SourceFile> {
  return (node) => (qf.is.kind(qc.Bundle, node) ? transformer.transformBundle(node) : transformer.transformSourceFile(node));
}
function wrapCustomTransformerFactory<T extends SourceFile | Bundle>(
  transformer: TransformerFactory<T> | CustomTransformerFactory,
  handleDefault: (node: Transformer<T>) => Transformer<Bundle | SourceFile>
): TransformerFactory<Bundle | SourceFile> {
  return (context) => {
    const customTransformer = transformer(context);
    return typeof customTransformer === 'function' ? handleDefault(customTransformer) : wrapCustomTransformer(customTransformer);
  };
}
function wrapScriptTransformerFactory(transformer: TransformerFactory<SourceFile> | CustomTransformerFactory): TransformerFactory<Bundle | SourceFile> {
  return wrapCustomTransformerFactory(transformer, chainBundle);
}
function wrapDeclarationTransformerFactory(transformer: TransformerFactory<Bundle | SourceFile> | CustomTransformerFactory): TransformerFactory<Bundle | SourceFile> {
  return wrapCustomTransformerFactory(transformer, identity);
}
export function noEmitSubstitution(_hint: qt.EmitHint, node: Node) {
  return node;
}
export function noEmitNotification(hint: qt.EmitHint, node: Node, callback: (hint: qt.EmitHint, node: Node) => void) {
  callback(hint, node);
}
export function transformNodes<T extends Node>(
  resolver: EmitResolver | undefined,
  host: EmitHost | undefined,
  opts: CompilerOpts,
  nodes: readonly T[],
  transformers: readonly TransformerFactory<T>[],
  allowDtsFiles: boolean
): TransformationResult<T> {
  const enabledSyntaxKindFeatures = new Array<SyntaxKindFeatureFlags>(Syntax.Count);
  let lexicalEnvironmentVariableDeclarations: VariableDeclaration[];
  let lexicalEnvironmentFunctionDeclarations: qt.FunctionDeclaration[];
  let lexicalEnvironmentStatements: qt.Statement[];
  let lexicalEnvironmentFlags = qt.LexicalEnvironmentFlags.None;
  let lexicalEnvironmentVariableDeclarationsStack: VariableDeclaration[][] = [];
  let lexicalEnvironmentFunctionDeclarationsStack: qt.FunctionDeclaration[][] = [];
  let lexicalEnvironmentStatementsStack: qt.Statement[][] = [];
  let lexicalEnvironmentFlagsStack: qt.LexicalEnvironmentFlags[] = [];
  let lexicalEnvironmentStackOffset = 0;
  let lexicalEnvironmentSuspended = false;
  let emitHelpers: qt.EmitHelper[] | undefined;
  let onSubstituteNode: qt.TrafoContext['onSubstituteNode'] = noEmitSubstitution;
  let onEmitNode: qt.TrafoContext['onEmitNode'] = noEmitNotification;
  let state = TransformationState.Uninitialized;
  const diagnostics: DiagnosticWithLocation[] = [];
  const context: qt.TrafoContext = {
    getCompilerOpts: () => opts,
    getEmitResolver: () => resolver!,
    getEmitHost: () => host!,
    startLexicalEnvironment,
    suspendLexicalEnvironment,
    resumeLexicalEnvironment,
    endLexicalEnvironment,
    setLexicalEnvironmentFlags,
    getLexicalEnvironmentFlags,
    hoistVariableDeclaration,
    hoistFunctionDeclaration,
    addInitializationStatement,
    requestEmitHelper,
    readEmitHelpers,
    enableSubstitution,
    enableEmitNotification,
    isSubstitutionEnabled,
    isEmitNotificationEnabled,
    get onSubstituteNode() {
      return onSubstituteNode;
    },
    set onSubstituteNode(value) {
      qu.assert(state < TransformationState.Initialized, 'Cannot modify transformation hooks after initialization has completed.');
      qu.assert(value !== undefined, "Value must not be 'undefined'");
      onSubstituteNode = value;
    },
    get onEmitNode() {
      return onEmitNode;
    },
    set onEmitNode(value) {
      qu.assert(state < TransformationState.Initialized, 'Cannot modify transformation hooks after initialization has completed.');
      qu.assert(value !== undefined, "Value must not be 'undefined'");
      onEmitNode = value;
    },
    addDiagnostic(diag) {
      diagnostics.push(diag);
    },
  };
  for (const node of nodes) {
    qf.emit.disposeEmits(qf.get.parseTreeOf(node).sourceFile);
  }
  performance.mark('beforeTransform');
  const transformersWithContext = transformers.map((t) => t(context));
  const transformation = (node: T): T => {
    for (const transform of transformersWithContext) {
      node = transform(node);
    }
    return node;
  };
  state = TransformationState.Initialized;
  const transformed = qu.map(nodes, allowDtsFiles ? transformation : transformRoot);
  state = TransformationState.Completed;
  performance.mark('afterTransform');
  performance.measure('transformTime', 'beforeTransform', 'afterTransform');
  return {
    transformed,
    substituteNode,
    emitNodeWithNotification,
    isEmitNotificationEnabled,
    dispose,
    diagnostics,
  };
  function transformRoot(node: T) {
    return node && (!qf.is.kind(qc.SourceFile, node) || !node.isDeclarationFile) ? transformation(node) : node;
  }
  function enableSubstitution(kind: Syntax) {
    qu.assert(state < TransformationState.Completed, 'Cannot modify the transformation context after transformation has completed.');
    enabledSyntaxKindFeatures[kind] |= SyntaxKindFeatureFlags.Substitution;
  }
  function isSubstitutionEnabled(node: Node) {
    return (enabledSyntaxKindFeatures[node.kind] & SyntaxKindFeatureFlags.Substitution) !== 0 && (qf.get.emitFlags(node) & EmitFlags.NoSubstitution) === 0;
  }
  function substituteNode(hint: qt.EmitHint, node: Node) {
    qu.assert(state < TransformationState.Disposed, 'Cannot substitute a node after the result is disposed.');
    return (node && isSubstitutionEnabled(node) && onSubstituteNode(hint, node)) || node;
  }
  function enableEmitNotification(kind: Syntax) {
    qu.assert(state < TransformationState.Completed, 'Cannot modify the transformation context after transformation has completed.');
    enabledSyntaxKindFeatures[kind] |= SyntaxKindFeatureFlags.EmitNotifications;
  }
  function isEmitNotificationEnabled(node: Node) {
    return (enabledSyntaxKindFeatures[node.kind] & SyntaxKindFeatureFlags.EmitNotifications) !== 0 || (qf.get.emitFlags(node) & EmitFlags.AdviseOnEmitNode) !== 0;
  }
  function emitNodeWithNotification(hint: qt.EmitHint, node: Node, emitCallback: (hint: qt.EmitHint, node: Node) => void) {
    qu.assert(state < TransformationState.Disposed, 'Cannot invoke TransformationResult callbacks after the result is disposed.');
    if (node) {
      if (isEmitNotificationEnabled(node)) onEmitNode(hint, node, emitCallback);
      else emitCallback(hint, node);
    }
  }
  function hoistVariableDeclaration(name: qt.Identifier): void {
    qu.assert(state > TransformationState.Uninitialized, 'Cannot modify the lexical environment during initialization.');
    qu.assert(state < TransformationState.Completed, 'Cannot modify the lexical environment after transformation has completed.');
    const decl = qf.emit.setFlags(new qc.VariableDeclaration(name), EmitFlags.NoNestedSourceMaps);
    if (!lexicalEnvironmentVariableDeclarations) lexicalEnvironmentVariableDeclarations = [decl];
    else lexicalEnvironmentVariableDeclarations.push(decl);
    if (lexicalEnvironmentFlags & qt.LexicalEnvironmentFlags.InParams) lexicalEnvironmentFlags |= qt.LexicalEnvironmentFlags.VariablesHoistedInParams;
  }
  function hoistFunctionDeclaration(func: qt.FunctionDeclaration): void {
    qu.assert(state > TransformationState.Uninitialized, 'Cannot modify the lexical environment during initialization.');
    qu.assert(state < TransformationState.Completed, 'Cannot modify the lexical environment after transformation has completed.');
    qf.emit.setFlags(func, EmitFlags.CustomPrologue);
    if (!lexicalEnvironmentFunctionDeclarations) lexicalEnvironmentFunctionDeclarations = [func];
    else lexicalEnvironmentFunctionDeclarations.push(func);
  }
  function addInitializationStatement(node: qt.Statement): void {
    qu.assert(state > TransformationState.Uninitialized, 'Cannot modify the lexical environment during initialization.');
    qu.assert(state < TransformationState.Completed, 'Cannot modify the lexical environment after transformation has completed.');
    qf.emit.setFlags(node, EmitFlags.CustomPrologue);
    if (!lexicalEnvironmentStatements) lexicalEnvironmentStatements = [node];
    else lexicalEnvironmentStatements.push(node);
  }
  function startLexicalEnvironment(): void {
    qu.assert(state > TransformationState.Uninitialized, 'Cannot modify the lexical environment during initialization.');
    qu.assert(state < TransformationState.Completed, 'Cannot modify the lexical environment after transformation has completed.');
    qu.assert(!lexicalEnvironmentSuspended, 'Lexical environment is suspended.');
    lexicalEnvironmentVariableDeclarationsStack[lexicalEnvironmentStackOffset] = lexicalEnvironmentVariableDeclarations;
    lexicalEnvironmentFunctionDeclarationsStack[lexicalEnvironmentStackOffset] = lexicalEnvironmentFunctionDeclarations;
    lexicalEnvironmentStatementsStack[lexicalEnvironmentStackOffset] = lexicalEnvironmentStatements;
    lexicalEnvironmentFlagsStack[lexicalEnvironmentStackOffset] = lexicalEnvironmentFlags;
    lexicalEnvironmentStackOffset++;
    lexicalEnvironmentVariableDeclarations = undefined!;
    lexicalEnvironmentFunctionDeclarations = undefined!;
    lexicalEnvironmentStatements = undefined!;
    lexicalEnvironmentFlags = qt.LexicalEnvironmentFlags.None;
  }
  function suspendLexicalEnvironment(): void {
    qu.assert(state > TransformationState.Uninitialized, 'Cannot modify the lexical environment during initialization.');
    qu.assert(state < TransformationState.Completed, 'Cannot modify the lexical environment after transformation has completed.');
    qu.assert(!lexicalEnvironmentSuspended, 'Lexical environment is already suspended.');
    lexicalEnvironmentSuspended = true;
  }
  function resumeLexicalEnvironment(): void {
    qu.assert(state > TransformationState.Uninitialized, 'Cannot modify the lexical environment during initialization.');
    qu.assert(state < TransformationState.Completed, 'Cannot modify the lexical environment after transformation has completed.');
    qu.assert(lexicalEnvironmentSuspended, 'Lexical environment is not suspended.');
    lexicalEnvironmentSuspended = false;
  }
  function endLexicalEnvironment(): qt.Statement[] | undefined {
    qu.assert(state > TransformationState.Uninitialized, 'Cannot modify the lexical environment during initialization.');
    qu.assert(state < TransformationState.Completed, 'Cannot modify the lexical environment after transformation has completed.');
    qu.assert(!lexicalEnvironmentSuspended, 'Lexical environment is suspended.');
    let statements: qt.Statement[] | undefined;
    if (lexicalEnvironmentVariableDeclarations || lexicalEnvironmentFunctionDeclarations || lexicalEnvironmentStatements) {
      if (lexicalEnvironmentFunctionDeclarations) statements = [...lexicalEnvironmentFunctionDeclarations];
      if (lexicalEnvironmentVariableDeclarations) {
        const statement = new qc.VariableStatement(undefined, new qc.VariableDeclarationList(lexicalEnvironmentVariableDeclarations));
        qf.emit.setFlags(statement, EmitFlags.CustomPrologue);
        if (!statements) statements = [statement];
        else statements.push(statement);
      }
      if (lexicalEnvironmentStatements) {
        if (!statements) statements = [...lexicalEnvironmentStatements];
        else statements = [...statements, ...lexicalEnvironmentStatements];
      }
    }
    lexicalEnvironmentStackOffset--;
    lexicalEnvironmentVariableDeclarations = lexicalEnvironmentVariableDeclarationsStack[lexicalEnvironmentStackOffset];
    lexicalEnvironmentFunctionDeclarations = lexicalEnvironmentFunctionDeclarationsStack[lexicalEnvironmentStackOffset];
    lexicalEnvironmentStatements = lexicalEnvironmentStatementsStack[lexicalEnvironmentStackOffset];
    lexicalEnvironmentFlags = lexicalEnvironmentFlagsStack[lexicalEnvironmentStackOffset];
    if (lexicalEnvironmentStackOffset === 0) {
      lexicalEnvironmentVariableDeclarationsStack = [];
      lexicalEnvironmentFunctionDeclarationsStack = [];
      lexicalEnvironmentStatementsStack = [];
      lexicalEnvironmentFlagsStack = [];
    }
    return statements;
  }
  function setLexicalEnvironmentFlags(flags: qt.LexicalEnvironmentFlags, value: boolean): void {
    lexicalEnvironmentFlags = value ? lexicalEnvironmentFlags | flags : lexicalEnvironmentFlags & ~flags;
  }
  function getLexicalEnvironmentFlags(): qt.LexicalEnvironmentFlags {
    return lexicalEnvironmentFlags;
  }
  function requestEmitHelper(helper: qt.EmitHelper): void {
    qu.assert(state > TransformationState.Uninitialized, 'Cannot modify the transformation context during initialization.');
    qu.assert(state < TransformationState.Completed, 'Cannot modify the transformation context after transformation has completed.');
    qu.assert(!helper.scoped, 'Cannot request a scoped emit helper.');
    if (helper.dependencies) {
      for (const h of helper.dependencies) {
        requestEmitHelper(h);
      }
    }
    emitHelpers = qu.append(emitHelpers, helper);
  }
  function readEmitHelpers(): qt.EmitHelper[] | undefined {
    qu.assert(state > TransformationState.Uninitialized, 'Cannot modify the transformation context during initialization.');
    qu.assert(state < TransformationState.Completed, 'Cannot modify the transformation context after transformation has completed.');
    const helpers = emitHelpers;
    emitHelpers = undefined;
    return helpers;
  }
  function dispose() {
    if (state < TransformationState.Disposed) {
      for (const node of nodes) {
        qf.emit.disposeEmits(qf.get.parseTreeOf(node).sourceFile);
      }
      lexicalEnvironmentVariableDeclarations = undefined!;
      lexicalEnvironmentVariableDeclarationsStack = undefined!;
      lexicalEnvironmentFunctionDeclarations = undefined!;
      lexicalEnvironmentFunctionDeclarationsStack = undefined!;
      onSubstituteNode = undefined!;
      onEmitNode = undefined!;
      emitHelpers = undefined;
      state = TransformationState.Disposed;
    }
  }
}
export const valuesHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:values',
  importName: '__values',
  scoped: false,
  text: `
            var __values = (this && this.__values) || function(o) {
                var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
                if (m) return m.call(o);
                if (o && typeof o.length === "number") return {
                    next: function () {
                        if (o && i >= o.length) o = void 0;
                        return { value: o && o[i++], done: !o };
                    }
                };
                throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
            };`,
};
export function createValuesHelper(context: qt.TrafoContext, expression: qt.Expression, location?: qu.TextRange) {
  context.requestEmitHelper(valuesHelper);
  return new qc.CallExpression(getUnscopedHelperName('__values'), undefined, [expression]).setRange(location);
}
export const readHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:read',
  importName: '__read',
  scoped: false,
  text: `
            var __read = (this && this.__read) || function (o, n) {
                var m = typeof Symbol === "function" && o[Symbol.iterator];
                if (!m) return o;
                var i = m.call(o), r, ar = [], e;
                try {
                    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
                }
                catch (error) { e = { error: error }; }
                finally {
                    try {
                        if (r && !r.done && (m = i["return"])) m.call(i);
                    }
                    finally { if (e) throw e.error; }
                }
                return ar;
            };`,
};
export function createReadHelper(context: qt.TrafoContext, iteratorRecord: qt.Expression, count: number | undefined, location?: qu.TextRange) {
  context.requestEmitHelper(readHelper);
  return new qc.CallExpression(getUnscopedHelperName('__read'), undefined, count !== undefined ? [iteratorRecord, qc.asLiteral(count)] : [iteratorRecord]).setRange(location);
}
export const spreadHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:spread',
  importName: '__spread',
  scoped: false,
  dependencies: [readHelper],
  text: `
            var __spread = (this && this.__spread) || function () {
                for (var ar = [], i = 0; i < args.length; i++) ar = ar.concat(__read(args[i]));
                return ar;
            };`,
};
export function createSpreadHelper(context: qt.TrafoContext, argList: readonly qt.Expression[], location?: qu.TextRange) {
  context.requestEmitHelper(spreadHelper);
  return new qc.CallExpression(getUnscopedHelperName('__spread'), undefined, argList).setRange(location);
}
export const spreadArraysHelper: qt.UnscopedEmitHelper = {
  name: 'typescript:spreadArrays',
  importName: '__spreadArrays',
  scoped: false,
  text: `
            var __spreadArrays = (this && this.__spreadArrays) || function () {
                for (var s = 0, i = 0, il = args.length; i < il; i++) s += args[i].length;
                for (var r = Array(s), k = 0, i = 0; i < il; i++)
                    for (var a = args[i], j = 0, jl = a.length; j < jl; j++, k++)
                        r[k] = a[j];
                return r;
            };`,
};
export function createSpreadArraysHelper(context: qt.TrafoContext, argList: readonly qt.Expression[], location?: qu.TextRange) {
  context.requestEmitHelper(spreadArraysHelper);
  return new qc.CallExpression(getUnscopedHelperName('__spreadArrays'), undefined, argList).setRange(location);
}
