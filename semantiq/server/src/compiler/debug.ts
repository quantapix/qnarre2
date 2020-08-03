import { FlowNode, Node } from './type';
import * as qu from './util';
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
export function printControlFlowGraph(n: FlowNode) {
  return console.log(formatControlFlowGraph(n));
}
export function formatControlFlowGraph(n: FlowNode) {
  return extendedDebug().formatControlFlowGraph(n);
}
export function attachFlowNodeDebugInfo(n: FlowNode) {
  if (isDebugInfoEnabled) {
    if (!('__debugFlowFlags' in n)) {
      Object.defineProperties(n, {
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
        return qc.format.symbolFlags(this.flags);
      },
    },
  });
  Object.defineProperties(Node.Type.prototype, {
    __debugFlags: {
      get(this: Type) {
        return qc.format.typeFlags(this.flags);
      },
    },
    __debugObjectFlags: {
      get(this: Type) {
        return this.flags & TypeFlags.Object ? qc.format.objectFlags((<ObjectType>this).objectFlags) : '';
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
            return qc.format.syntax(this.kind);
          },
        },
        __debugNodeFlags: {
          get(this: Node) {
            return qc.format.nodeFlags(this.flags);
          },
        },
        __debugModifierFlags: {
          get(this: Node) {
            return qc.format.modifierFlags(qc.get.effectiveModifierFlagsNoCache(this));
          },
        },
        __debugTrafoFlags: {
          get(this: Node) {
            return qc.format.trafoFlags(this.trafoFlags);
          },
        },
        __debugIsParseTreeNode: {
          get(this: Node) {
            return qc.is.parseTreeNode(this);
          },
        },
        __debugEmitFlags: {
          get(this: Node) {
            return qc.format.emitFlags(qc.get.emitFlags(this));
          },
        },
        __debugGetText: {
          value(this: Node, includeTrivia?: boolean) {
            if (isSynthesized(this)) return '';
            const parseNode = qc.get.parseTreeOf(this);
            const sourceFile = parseNode && parseNode.sourceFile;
            return sourceFile ? qf.get.sourceTextOfNodeFromSourceFile(sourceFile, parseNode, includeTrivia) : '';
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
