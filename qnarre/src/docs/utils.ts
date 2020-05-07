import winston from "winston";
import { strict } from "assert";
import { DepGraph } from "dependency-graph";

export type Action = (...args: any[]) => any;

export interface Factory extends Action {
  name?: string;
}

export function assert(cond: any, msg?: string): asserts cond {
  strict(cond, msg);
}

export function sortByDeps<T extends { name: string }>(
  byName: Map<string, T>,
  after?: string,
  before?: string
): T[] {
  const graph = new DepGraph();
  byName.forEach(i => {
    graph.addNode(i.name);
  });

  function addDeps(item: T, prop?: string, revert = false) {
    if (prop && item[prop]) {
      const deps = item[prop] as string[];
      deps.forEach(d => {
        assert(byName.has(d), `Missing dep ${d} on ${item.name}`);
        if (revert) {
          graph.addDependency(d, item.name);
        } else {
          graph.addDependency(item.name, d);
        }
      });
    }
  }

  byName.forEach(i => {
    addDeps(i, after);
    addDeps(i, before, true);
  });
  return graph.overallOrder().map(n => {
    return byName.get(n)!;
  });
}

export function injFactory(inj: { invoke: Action }) {
  return (fs: Factory[]) => {
    return fs.map(f => {
      const i = inj.invoke(f);
      if (i && !i.name) {
        i.name = f.name;
      }
      return i;
    });
  };
}

export function logFactory() {
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    defaultMeta: { service: "user-service" },
    transports: [
      new winston.transports.File({ filename: "error.log", level: "error" }),
      new winston.transports.File({ filename: "combined.log" })
    ]
  });
  if (process.env.NODE_ENV !== "production") {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    );
  }
  return logger;
}
