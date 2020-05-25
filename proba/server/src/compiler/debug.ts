/* eslint-disable no-debugger */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-inner-declarations */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import * as qc from './core';
import * as qt from './types';
import * as qu from './utilities';
import * as qpu from './utilitiesPublic';
import * as qp from './path';
import * as sys from './sys';

export namespace Debug {
  let currentAssertionLevel = qc.AssertionLevel.None;

  // eslint-disable-next-line prefer-const
  export let isDebugging = false;

  type AssertionKeys = qt.MatchingKeys<typeof Debug, qc.AnyFunction>;

  const assertionCache: Partial<Record<AssertionKeys, { level: qc.AssertionLevel; assertion: qc.AnyFunction }>> = {};

  export function getAssertionLevel() {
    return currentAssertionLevel;
  }

  export function setAssertionLevel(level: qc.AssertionLevel) {
    const prevAssertionLevel = currentAssertionLevel;
    currentAssertionLevel = level;

    if (level > prevAssertionLevel) {
      // restore assertion functions for the current assertion level (see `shouldAssertFunction`).
      for (const key of qc.getOwnKeys(assertionCache) as AssertionKeys[]) {
        const cachedFunc = assertionCache[key];
        if (cachedFunc !== undefined && Debug[key] !== cachedFunc.assertion && level >= cachedFunc.level) {
          (Debug as any)[key] = cachedFunc;
          assertionCache[key] = undefined;
        }
      }
    }
  }

  export function shouldAssert(level: qc.AssertionLevel): boolean {
    return currentAssertionLevel >= level;
  }

  /**
   * Tests whether an assertion function should be executed. If it shouldn't, it is cached and replaced with `ts.noop`.
   * Replaced assertion functions are restored when `Debug.setAssertionLevel` is set to a high enough level.
   * @param level The minimum assertion level required.
   * @param name The name of the current assertion function.
   */
  function shouldAssertFunction<K extends AssertionKeys>(level: qc.AssertionLevel, name: K): boolean {
    if (!shouldAssert(level)) {
      assertionCache[name] = { level, assertion: Debug[name] };
      (Debug as any)[name] = qc.noop;
      return false;
    }
    return true;
  }

  export function fail(message?: string, stackCrawlMark?: qc.AnyFunction): never {
    debugger;
    const e = new Error(message ? `Debug Failure. ${message}` : 'Debug Failure.');
    if ((<any>Error).captureStackTrace) {
      (<any>Error).captureStackTrace(e, stackCrawlMark || fail);
    }
    throw e;
  }

  export function failBadSyntaxKind(node: qt.Node, message?: string, stackCrawlMark?: qc.AnyFunction): never {
    return fail(`${message || 'Unexpected node.'}\r\nNode ${formatSyntaxKind(node.kind)} was unexpected.`, stackCrawlMark || failBadSyntaxKind);
  }

  export function assert(expression: unknown, message?: string, verboseDebugInfo?: string | (() => string), stackCrawlMark?: qc.AnyFunction): asserts expression {
    if (!expression) {
      message = message ? `False expression: ${message}` : 'False expression.';
      if (verboseDebugInfo) {
        message += '\r\nVerbose Debug Information: ' + (typeof verboseDebugInfo === 'string' ? verboseDebugInfo : verboseDebugInfo());
      }
      fail(message, stackCrawlMark || assert);
    }
  }

  export function assertEqual<T>(a: T, b: T, msg?: string, msg2?: string, stackCrawlMark?: qc.AnyFunction): void {
    if (a !== b) {
      const message = msg ? (msg2 ? `${msg} ${msg2}` : msg) : '';
      fail(`Expected ${a} === ${b}. ${message}`, stackCrawlMark || assertEqual);
    }
  }

  export function assertLessThan(a: number, b: number, msg?: string, stackCrawlMark?: qc.AnyFunction): void {
    if (a >= b) {
      fail(`Expected ${a} < ${b}. ${msg || ''}`, stackCrawlMark || assertLessThan);
    }
  }

  export function assertLessThanOrEqual(a: number, b: number, stackCrawlMark?: qc.AnyFunction): void {
    if (a > b) {
      fail(`Expected ${a} <= ${b}`, stackCrawlMark || assertLessThanOrEqual);
    }
  }

  export function assertGreaterThanOrEqual(a: number, b: number, stackCrawlMark?: qc.AnyFunction): void {
    if (a < b) {
      fail(`Expected ${a} >= ${b}`, stackCrawlMark || assertGreaterThanOrEqual);
    }
  }

  export function assertIsDefined<T>(value: T, message?: string, stackCrawlMark?: qc.AnyFunction): asserts value is NonNullable<T> {
    if (value === undefined || value === null) {
      fail(message, stackCrawlMark || assertIsDefined);
    }
  }

  export function checkDefined<T>(value: T | null | undefined, message?: string, stackCrawlMark?: qc.AnyFunction): T {
    assertIsDefined(value, message, stackCrawlMark || checkDefined);
    return value;
  }

  /**
   * @deprecated Use `checkDefined` to check whether a value is defined inline. Use `assertIsDefined` to check whether
   * a value is defined at the statement level.
   */
  export const assertDefined = checkDefined;

  export function assertEachIsDefined<T extends qt.Node>(value: qt.NodeArray<T>, message?: string, stackCrawlMark?: qc.AnyFunction): asserts value is qt.NodeArray<T>;
  export function assertEachIsDefined<T>(value: readonly T[], message?: string, stackCrawlMark?: qc.AnyFunction): asserts value is readonly NonNullable<T>[];
  export function assertEachIsDefined<T>(value: readonly T[], message?: string, stackCrawlMark?: qc.AnyFunction) {
    for (const v of value) {
      assertIsDefined(v, message, stackCrawlMark || assertEachIsDefined);
    }
  }

  export function checkEachDefined<T, A extends readonly T[]>(value: A, message?: string, stackCrawlMark?: qc.AnyFunction): A {
    assertEachIsDefined(value, message, stackCrawlMark || checkEachDefined);
    return value;
  }

  /**
   * @deprecated Use `checkEachDefined` to check whether the elements of an array are defined inline. Use `assertEachIsDefined` to check whether
   * the elements of an array are defined at the statement level.
   */
  export const assertEachDefined = checkEachDefined;

  export function assertNever(member: never, message = 'Illegal value:', stackCrawlMark?: qc.AnyFunction): never {
    const detail = typeof member === 'object' && qc.hasProperty(member, 'kind') && qc.hasProperty(member, 'pos') && formatSyntaxKind ? 'SyntaxKind: ' + formatSyntaxKind((member as qt.Node).kind) : JSON.stringify(member);
    return fail(`${message} ${detail}`, stackCrawlMark || assertNever);
  }

  export function assertEachNode<T extends qt.Node, U extends T>(nodes: qt.NodeArray<T>, test: (node: T) => node is U, message?: string, stackCrawlMark?: qc.AnyFunction): asserts nodes is qt.NodeArray<U>;
  export function assertEachNode<T extends qt.Node, U extends T>(nodes: readonly T[], test: (node: T) => node is U, message?: string, stackCrawlMark?: qc.AnyFunction): asserts nodes is readonly U[];
  export function assertEachNode(nodes: readonly qt.Node[], test: (node: qt.Node) => boolean, message?: string, stackCrawlMark?: qc.AnyFunction): void;
  export function assertEachNode(nodes: readonly qt.Node[], test: (node: qt.Node) => boolean, message?: string, stackCrawlMark?: qc.AnyFunction) {
    if (shouldAssertFunction(qc.AssertionLevel.Normal, 'assertEachNode')) {
      assert(test === undefined || qc.every(nodes, test), message || 'Unexpected node.', () => `Node array did not pass test '${getFunctionName(test)}'.`, stackCrawlMark || assertEachNode);
    }
  }

  export function assertNode<T extends qt.Node, U extends T>(node: T | undefined, test: (node: T) => node is U, message?: string, stackCrawlMark?: qc.AnyFunction): asserts node is U;
  export function assertNode(node: qt.Node | undefined, test: ((node: qt.Node) => boolean) | undefined, message?: string, stackCrawlMark?: qc.AnyFunction): void;
  export function assertNode(node: qt.Node | undefined, test: ((node: qt.Node) => boolean) | undefined, message?: string, stackCrawlMark?: qc.AnyFunction) {
    if (shouldAssertFunction(qc.AssertionLevel.Normal, 'assertNode')) {
      assert(node !== undefined && (test === undefined || test(node)), message || 'Unexpected node.', () => `Node ${formatSyntaxKind(node!.kind)} did not pass test '${getFunctionName(test!)}'.`, stackCrawlMark || assertNode);
    }
  }

  export function assertNotNode<T extends qt.Node, U extends T>(node: T | undefined, test: (node: qt.Node) => node is U, message?: string, stackCrawlMark?: qc.AnyFunction): asserts node is Exclude<T, U>;
  export function assertNotNode(node: qt.Node | undefined, test: ((node: qt.Node) => boolean) | undefined, message?: string, stackCrawlMark?: qc.AnyFunction): void;
  export function assertNotNode(node: qt.Node | undefined, test: ((node: qt.Node) => boolean) | undefined, message?: string, stackCrawlMark?: qc.AnyFunction) {
    if (shouldAssertFunction(qc.AssertionLevel.Normal, 'assertNotNode')) {
      assert(node === undefined || test === undefined || !test(node), message || 'Unexpected node.', () => `Node ${formatSyntaxKind(node!.kind)} should not have passed test '${getFunctionName(test!)}'.`, stackCrawlMark || assertNotNode);
    }
  }

  export function assertOptionalNode<T extends qt.Node, U extends T>(node: T, test: (node: T) => node is U, message?: string, stackCrawlMark?: qc.AnyFunction): asserts node is U;
  export function assertOptionalNode<T extends qt.Node, U extends T>(node: T | undefined, test: (node: T) => node is U, message?: string, stackCrawlMark?: qc.AnyFunction): asserts node is U | undefined;
  export function assertOptionalNode(node: qt.Node | undefined, test: ((node: qt.Node) => boolean) | undefined, message?: string, stackCrawlMark?: qc.AnyFunction): void;
  export function assertOptionalNode(node: qt.Node | undefined, test: ((node: qt.Node) => boolean) | undefined, message?: string, stackCrawlMark?: qc.AnyFunction) {
    if (shouldAssertFunction(qc.AssertionLevel.Normal, 'assertOptionalNode')) {
      assert(test === undefined || node === undefined || test(node), message || 'Unexpected node.', () => `Node ${formatSyntaxKind(node!.kind)} did not pass test '${getFunctionName(test!)}'.`, stackCrawlMark || assertOptionalNode);
    }
  }

  export function assertOptionalToken<T extends qt.Node, K extends qt.SyntaxKind>(node: T, kind: K, message?: string, stackCrawlMark?: qc.AnyFunction): asserts node is Extract<T, { readonly kind: K }>;
  export function assertOptionalToken<T extends qt.Node, K extends qt.SyntaxKind>(node: T | undefined, kind: K, message?: string, stackCrawlMark?: qc.AnyFunction): asserts node is Extract<T, { readonly kind: K }> | undefined;
  export function assertOptionalToken(node: qt.Node | undefined, kind: qt.SyntaxKind | undefined, message?: string, stackCrawlMark?: qc.AnyFunction): void;
  export function assertOptionalToken(node: qt.Node | undefined, kind: qt.SyntaxKind | undefined, message?: string, stackCrawlMark?: qc.AnyFunction) {
    if (shouldAssertFunction(qc.AssertionLevel.Normal, 'assertOptionalToken')) {
      assert(kind === undefined || node === undefined || node.kind === kind, message || 'Unexpected node.', () => `Node ${formatSyntaxKind(node!.kind)} was not a '${formatSyntaxKind(kind)}' token.`, stackCrawlMark || assertOptionalToken);
    }
  }

  export function assertMissingNode(node: qt.Node | undefined, message?: string, stackCrawlMark?: qc.AnyFunction): asserts node is undefined;
  export function assertMissingNode(node: qt.Node | undefined, message?: string, stackCrawlMark?: qc.AnyFunction) {
    if (shouldAssertFunction(qc.AssertionLevel.Normal, 'assertMissingNode')) {
      assert(node === undefined, message || 'Unexpected node.', () => `Node ${formatSyntaxKind(node!.kind)} was unexpected'.`, stackCrawlMark || assertMissingNode);
    }
  }

  export function getFunctionName(func: qc.AnyFunction) {
    if (typeof func !== 'function') {
      return '';
    } else if (func.hasOwnProperty('name')) {
      return (<any>func).name;
    } else {
      const text = Function.prototype.toString.call(func);
      const match = /^function\s+([\w\$]+)\s*\(/.exec(text);
      return match ? match[1] : '';
    }
  }

  export function formatSymbol(symbol: symbol): string {
    return `{ name: ${qpu.unescapeLeadingUnderscores(symbol.escapedName)}; flags: ${formatSymbolFlags(symbol.flags)}; declarations: ${map(symbol.declarations, (node) => formatSyntaxKind(node.kind))} }`;
  }

  /**
   * Formats an enum value as a string for debugging and debug assertions.
   */
  export function formatEnum(value = 0, enumObject: any, isFlags?: boolean) {
    const members = getEnumMembers(enumObject);
    if (value === 0) {
      return members.length > 0 && members[0][0] === 0 ? members[0][1] : '0';
    }
    if (isFlags) {
      let result = '';
      let remainingFlags = value;
      for (const [enumValue, enumName] of members) {
        if (enumValue > value) {
          break;
        }
        if (enumValue !== 0 && enumValue & value) {
          result = `${result}${result ? '|' : ''}${enumName}`;
          remainingFlags &= ~enumValue;
        }
      }
      if (remainingFlags === 0) {
        return result;
      }
    } else {
      for (const [enumValue, enumName] of members) {
        if (enumValue === value) {
          return enumName;
        }
      }
    }
    return value.toString();
  }

  function getEnumMembers(enumObject: any) {
    const result: [number, string][] = [];
    for (const name in enumObject) {
      const value = enumObject[name];
      if (typeof value === 'number') {
        result.push([value, name]);
      }
    }

    return qc.stableSort<[number, string]>(result, (x, y) => qc.qc.compareValues(x[0], y[0]));
  }

  export function formatSyntaxKind(kind: qt.SyntaxKind | undefined): string {
    return formatEnum(kind, qt.SyntaxKind, /*isFlags*/ false);
  }

  export function formatNodeFlags(flags: qt.NodeFlags | undefined): string {
    return formatEnum(flags, qt.NodeFlags, /*isFlags*/ true);
  }

  export function formatModifierFlags(flags: qt.ModifierFlags | undefined): string {
    return formatEnum(flags, qt.ModifierFlags, /*isFlags*/ true);
  }

  export function formatTransformFlags(flags: qt.TransformFlags | undefined): string {
    return formatEnum(flags, qt.TransformFlags, /*isFlags*/ true);
  }

  export function formatEmitFlags(flags: qt.EmitFlags | undefined): string {
    return formatEnum(flags, qt.EmitFlags, /*isFlags*/ true);
  }

  export function formatSymbolFlags(flags: qt.SymbolFlags | undefined): string {
    return formatEnum(flags, qt.SymbolFlags, /*isFlags*/ true);
  }

  export function formatTypeFlags(flags: qt.TypeFlags | undefined): string {
    return formatEnum(flags, qt.TypeFlags, /*isFlags*/ true);
  }

  export function formatObjectFlags(flags: qt.ObjectFlags | undefined): string {
    return formatEnum(flags, qt.ObjectFlags, /*isFlags*/ true);
  }

  let isDebugInfoEnabled = false;

  interface ExtendedDebugModule {
    init(_ts: typeof ts): void;
    formatControlFlowGraph(flowNode: qt.FlowNode): string;
  }

  let extendedDebugModule: ExtendedDebugModule | undefined;

  function extendedDebug() {
    enableDebugInfo();
    if (!extendedDebugModule) {
      throw new Error('Debugging helpers could not be loaded.');
    }
    return extendedDebugModule;
  }

  export function printControlFlowGraph(flowNode: qt.FlowNode) {
    return console.log(formatControlFlowGraph(flowNode));
  }

  export function formatControlFlowGraph(flowNode: qt.FlowNode) {
    return extendedDebug().formatControlFlowGraph(flowNode);
  }

  export function attachFlowNodeDebugInfo(flowNode: qt.FlowNode) {
    if (isDebugInfoEnabled) {
      if (!('__debugFlowFlags' in flowNode)) {
        Object.defineProperties(flowNode, {
          __debugFlowFlags: {
            get(this: qt.FlowNode) {
              return formatEnum(this.flags, (ts as any).FlowFlags, /*isFlags*/ true);
            },
          },
          __debugToString: {
            value(this: qt.FlowNode) {
              return formatControlFlowGraph(this);
            },
          },
        });
      }
    }
  }

  /**
   * Injects debug information into frequently used types.
   */
  export function enableDebugInfo() {
    if (isDebugInfoEnabled) return;

    // Add additional properties in debug mode to assist with debugging.
    Object.defineProperties(qu.objectAllocator.getSymbolConstructor().prototype, {
      __debugFlags: {
        get(this: symbol) {
          return formatSymbolFlags(this.flags);
        },
      },
    });

    Object.defineProperties(qu.objectAllocator.getTypeConstructor().prototype, {
      __debugFlags: {
        get(this: qt.Type) {
          return formatTypeFlags(this.flags);
        },
      },
      __debugObjectFlags: {
        get(this: qt.Type) {
          return this.flags & qt.TypeFlags.Object ? formatObjectFlags(this.objectFlags) : '';
        },
      },
      __debugTypeToString: {
        value(this: qt.Type) {
          return this.checker.typeToString(this);
        },
      },
    });

    const nodeConstructors = [qu.objectAllocator.getNodeConstructor(), qu.objectAllocator.getIdentifierConstructor(), qu.objectAllocator.getTokenConstructor(), qu.objectAllocator.getSourceFileConstructor()];

    for (const ctor of nodeConstructors) {
      if (!ctor.prototype.hasOwnProperty('__debugKind')) {
        Object.defineProperties(ctor.prototype, {
          __debugKind: {
            get(this: qt.Node) {
              return formatSyntaxKind(this.kind);
            },
          },
          __debugNodeFlags: {
            get(this: qt.Node) {
              return formatNodeFlags(this.flags);
            },
          },
          __debugModifierFlags: {
            get(this: qt.Node) {
              return formatModifierFlags(qu.getEffectiveModifierFlagsNoCache(this));
            },
          },
          __debugTransformFlags: {
            get(this: qt.Node) {
              return formatTransformFlags(this.transformFlags);
            },
          },
          __debugIsParseTreeNode: {
            get(this: qt.Node) {
              return qpu.isParseTreeNode(this);
            },
          },
          __debugEmitFlags: {
            get(this: qt.Node) {
              return formatEmitFlags(qu.getEmitFlags(this));
            },
          },
          __debugGetText: {
            value(this: qt.Node, includeTrivia?: boolean) {
              if (qu.nodeIsSynthesized(this)) return '';
              const parseNode = qpu.getParseTreeNode(this);
              const sourceFile = parseNode && qu.getSourceFileOfNode(parseNode);
              return sourceFile ? qu.getSourceTextOfNodeFromSourceFile(sourceFile, parseNode, includeTrivia) : '';
            },
          },
        });
      }
    }

    // attempt to load extended debugging information
    try {
      if (sys && sys.require) {
        const basePath = qp.getDirectoryPath(qp.resolvePath(sys.getExecutingFilePath()));
        const result = sys.require(basePath, './compiler-debug');
        if (!result.error) {
          result.module.init(ts);
          extendedDebugModule = result.module;
        }
      }
    } catch {
      // do nothing
    }

    isDebugInfoEnabled = true;
  }
}
