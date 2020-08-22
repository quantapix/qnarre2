import { qt.FlowNode, Node } from './types';
import { qf } from './core';
import { Syntax } from './syntax';
import * as qc from './core';
import * as qd from './diags';
import * as qt from './types';
import * as qu from './utils';
import * as qy from './syntax';
export let isDebugging = false;
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
export function printControlFlowGraph(n: qt.FlowNode) {
  return console.log(formatControlFlowGraph(n));
}
export function formatControlFlowGraph(n: qt.FlowNode) {
  return extendedDebug().formatControlFlowGraph(n);
}
export function attachFlowNodeDebugInfo(n: qt.FlowNode) {
  if (isDebugInfoEnabled) {
    if (!('__debugFlowFlags' in n)) {
      Object.defineProperties(n, {
        __debugFlowFlags: {
          get(this: qt.FlowNode) {
            return formatEnum(this.flags, (ts as any).FlowFlags, true);
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
export function enableDebugInfo() {
  if (isDebugInfoEnabled) return;
  Object.defineProperties(Node.Symbol.prototype, {
    __debugFlags: {
      get(this: qt.Symbol) {
        return qf.format.symbolFlags(this.flags);
      },
    },
  });
  Object.defineProperties(Node.Type.prototype, {
    __debugFlags: {
      get(this: qt.Type) {
        return qf.format.typeFlags(this.flags);
      },
    },
    __debugObjectFlags: {
      get(this: qt.Type) {
        return qf.type.is.object(this) ? qf.format.objectFlags((<qt.ObjectType>this).objectFlags) : '';
      },
    },
    __debugTypeToString: {
      value(this: qt.Type) {
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
            return qf.format.syntax(this.kind);
          },
        },
        __debugNodeFlags: {
          get(this: Node) {
            return qf.format.nodeFlags(this.flags);
          },
        },
        __debugModifierFlags: {
          get(this: Node) {
            return qf.format.modifierFlags(qf.get.effectiveModifierFlagsNoCache(this));
          },
        },
        __debugTrafoFlags: {
          get(this: Node) {
            return qf.format.trafoFlags(this.trafoFlags);
          },
        },
        __debugIsParseTreeNode: {
          get(this: Node) {
            return qf.is.parseTreeNode(this);
          },
        },
        __debugEmitFlags: {
          get(this: Node) {
            return qf.format.emitFlags(qf.get.emitFlags(this));
          },
        },
        __debugGetText: {
          value(this: Node, includeTrivia?: boolean) {
            if (qf.is.synthesized(this)) return '';
            const parseNode = qf.get.parseTreeOf(this);
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
      const result = sys.require(basePath, './compiler-debug') as qt.RequireResult<ExtendedDebugModule>;
      if (!result.error) {
        result.module.init(ts);
        extendedDebugModule = result.module;
      }
    }
  } catch {}
  isDebugInfoEnabled = true;
}
