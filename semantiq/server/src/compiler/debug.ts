import * as qb from './base';
import { Node } from './types';
export let isDebugging = false;
let isDebugInfoEnabled = false;
interface ExtendedDebugModule {
  init(_ts: typeof ts): void;
  formatControlFlowGraph(flowNode: FlowNode): string;
}
let extendedDebugModule: ExtendedDebugModule | undefined;
function extendedDebug() {
  enableDebugInfo();
  if (!extendedDebugModule) {
    throw new Error('Debugging helpers could not be loaded.');
  }
  return extendedDebugModule;
}
export function printControlFlowGraph(flowNode: FlowNode) {
  return console.log(formatControlFlowGraph(flowNode));
}
export function formatControlFlowGraph(flowNode: FlowNode) {
  return extendedDebug().formatControlFlowGraph(flowNode);
}
export function attachFlowNodeDebugInfo(flowNode: FlowNode) {
  if (isDebugInfoEnabled) {
    if (!('__debugFlowFlags' in flowNode)) {
      Object.defineProperties(flowNode, {
        __debugFlowFlags: {
          get(this: FlowNode) {
            return formatEnum(this.flags, (ts as any).FlowFlags, true);
          },
        },
        __debugToString: {
          value(this: FlowNode) {
            return formatControlFlowGraph(this);
          },
        },
      });
    }
  }
}
export function enableDebugInfo() {
  if (isDebugInfoEnabled) return;
  Object.defineProperties(Node.Symbol.prototype, {
    __debugFlags: {
      get(this: Symbol) {
        return formatSymbolFlags(this.flags);
      },
    },
  });
  Object.defineProperties(Node.Type.prototype, {
    __debugFlags: {
      get(this: Type) {
        return formatTypeFlags(this.flags);
      },
    },
    __debugObjectFlags: {
      get(this: Type) {
        return this.flags & TypeFlags.Object ? formatObjectFlags((<ObjectType>this).objectFlags) : '';
      },
    },
    __debugTypeToString: {
      value(this: Type) {
        return this.checker.typeToString(this);
      },
    },
  });
  const nodeConstructors = [Node.NodeObj, Node.IdentifierObj, Node.TokenObj, Node.SourceFileObj];
  for (const ctor of nodeConstructors) {
    if (!ctor.prototype.hasOwnProperty('__debugKind')) {
      Object.defineProperties(ctor.prototype, {
        __debugKind: {
          get(this: Node) {
            return formatSyntax(this.kind);
          },
        },
        __debugNodeFlags: {
          get(this: Node) {
            return formatNodeFlags(this.flags);
          },
        },
        __debugModifierFlags: {
          get(this: Node) {
            return formatModifierFlags(qc.get.effectiveModifierFlagsNoCache(this));
          },
        },
        __debugTransformFlags: {
          get(this: Node) {
            return formatTransformFlags(this.transformFlags);
          },
        },
        __debugIsParseTreeNode: {
          get(this: Node) {
            return qc.is.parseTreeNode(this);
          },
        },
        __debugEmitFlags: {
          get(this: Node) {
            return formatEmitFlags(qc.get.emitFlags(this));
          },
        },
        __debugGetText: {
          value(this: Node, includeTrivia?: boolean) {
            if (isSynthesized(this)) return '';
            const parseNode = qc.get.parseTreeOf(this);
            const sourceFile = parseNode && qc.get.sourceFileOf(parseNode);
            return sourceFile ? getSourceTextOfNodeFromSourceFile(sourceFile, parseNode, includeTrivia) : '';
          },
        },
      });
    }
  }
  try {
    if (sys && sys.require) {
      const basePath = getDirectoryPath(resolvePath(sys.getExecutingFilePath()));
      const result = sys.require(basePath, './compiler-debug') as RequireResult<ExtendedDebugModule>;
      if (!result.error) {
        result.module.init(ts);
        extendedDebugModule = result.module;
      }
    }
  } catch {}
  isDebugInfoEnabled = true;
}
