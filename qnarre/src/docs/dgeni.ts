import { Injector, Module } from "./injector";
import { Doc, Package, Processor } from "./package";
import { assert, injFactory, logFactory, sortByDeps } from "./utils";

type Handler = (...xs: any[]) => any;

export class Dgeni {
  procs: Processor[] = [];
  handlers = new Map<string, Handler[]>();

  private _packs = new Map<string, Package>();
  private _inj?: Injector;

  constructor(packs: Package[] = []) {
    assert(Array.isArray(packs));
    packs.forEach(p => this.addPackage(p), this);
  }

  addPackage(pack: string | Package, deps: (string | Package)[] = []): Package {
    assert(!this._inj);
    if (typeof pack === "string") {
      assert(!this._packs.has(pack));
      pack = new Package(pack, deps);
    } else {
      assert(!this._packs.has(pack.name));
    }
    this._packs.set(pack.name, pack);
    pack.refs = pack.deps.map(d => {
      if (typeof d === "string") return d;
      if (!this._packs.has(d.name)) this.addPackage(d);
      return d.name;
    }, this);
    return pack;
  }

  getPackage(name: string): Package | undefined {
    return this._packs.get(name);
  }

  configure() {
    if (!this._inj) {
      const ps = sortByDeps(this._packs, "refs");
      const ms = ps.map(p => p.module);
      const m: Module = new Map();
      m.set("dgeni", ["value", this]);
      m.set("log", ["factory", logFactory]);
      m.set("getInjectables", ["factory", injFactory]);
      ms.unshift(m);
      const inj = (this._inj = new Injector(ms));
      for (const p of ps) {
        for (const c of p.configs) {
          inj.invoke(c, undefined);
        }
      }
      const rs = new Map<string, Processor>();
      for (const p of ps) {
        for (const n of p.procs) {
          const r = inj.get(n) as Processor;
          r.name = n;
          r.$package = p.name;
          if (r.$enabled !== false) {
            rs.set(n, r);
          }
        }
        for (const [n, hns] of p.handlers) {
          const hs: Handler[] = (this.handlers[n] = this.handlers[n] || []);
          for (const hn of hns) {
            hs.push(inj.get(hn) as Handler);
          }
        }
      }
      this.procs = sortByDeps(rs, "$runAfter", "$runBefore");
    }
    return this._inj;
  }

  async generate(): Promise<Doc[]> {
    const log = this.configure().get("log");
    let docs: Doc[] = [];
    const p = this.triggerEvent("genStart");
    p.then(() => docs);
    for (const r of this.procs) {
      p.then(ds => this.runProcessor(r, ds));
    }
    p.catch((e: Error) => {
      const m = `Error processing: ${e.stack || e.message || e}`;
      log.error(m);
    });
    docs = await p;
    this.triggerEvent("genEnd");
    return docs;
  }

  async runProcessor(proc: Processor, docs: Doc[]): Promise<Doc[]> {
    if (proc.$process) {
      const log = this._inj!.get("log");
      const p = this.triggerProcessorEvent("procStart", proc, docs);
      p.then(async (ds: Doc[]) => {
        log.info(`running proc: ${proc.name}`);
        ds = (await proc.$process!(ds)) || ds;
        return this.triggerProcessorEvent("procEnd", proc, ds);
      });
      p.catch((e: Error) => {
        e.message = `Error running proc ${proc.name}:\n ${e.message}`;
        log.error(e.stack || e.message);
      });
    }
    return docs;
  }

  async triggerEvent(name: string, ...args: any[]): Promise<Doc[]> {
    const ds: Doc[] = [];
    const hs: Handler[] = this.handlers[name] || [];
    for (const h of hs) {
      ds.push(h(name, ...args));
    }
    return ds;
  }

  async triggerProcessorEvent(name: string, proc: Processor, docs: Doc[]) {
    await this.triggerEvent(name, proc, docs);
    return docs;
  }

  info() {
    const log = this.configure().get("log");
    for (const p of this._packs.values()) {
      const rs = p.deps
        .map(d => {
          return JSON.stringify(typeof d === "string" ? d : d.name);
        })
        .join(", ");
      log.info(`${p.name}, [${rs}]`);
    }
    log.info("== Processors (processing order) ==");
    this.procs.forEach((p, i) => {
      const m = `${i + 1}: ${p.name} ${p.$process ? "" : "(abstract)"}`;
      log.info(`${m} from ${p.$package}`);
      if (p.description) {
        log.info(`   ${p.description}`);
      }
    });
  }
}
