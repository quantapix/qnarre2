import { Action, Factory } from "./utils";

export type Typing = Factory;

type Injection = "factory" | "typing" | "value";

export type Module = Map<string, [Injection, any]>;

type Provider = [Action, any, Injection];
type Instance = any;

export class Injector {
  private _providers = new Map<string, Provider>();
  private _instances = new Map<string, Instance>();
  private _resolving: string[] = [];
  private _actions = {
    factory: this.invoke,
    type: this.create,
    value(v: any) {
      return v;
    }
  };

  constructor(ms: Module[], private _parent?: { get(_: string): Instance }) {
    this._parent = _parent || {
      get: (n: string) => {
        this._resolving.push(n);
        throw new Error(`No provider for ${n}`);
      }
    };
    for (const m of ms) {
      for (const [n, [i, v]] of m) {
        this._providers.set(n, [this._actions[i], v, i]);
      }
    }
  }

  get(name: string): Instance {
    const ps = this._providers;
    if (!ps.has(name) && name.indexOf(".") !== -1) {
      const ns = name.split(".");
      let p = this.get(ns.shift()!);
      for (const n of ns) {
        p = p[n];
      }
      return p;
    }
    const ins = this._instances;
    if (ins.has(name)) {
      return ins.get(name);
    }
    const rs = this._resolving;
    if (ps.has(name)) {
      if (rs.indexOf(name) !== -1) {
        rs.push(name);
        throw this.error("Circular dependency");
      }
      rs.push(name);
      const [a, v] = ps.get(name)!;
      const i = a(v);
      ins.set(name, i);
      rs.pop();
      return i;
    }
    return this._parent!.get(name);
  }

  invoke(fac: Factory, ctxt: any) {
    const args: string[] = [];
    const deps = args.map(d => {
      return this.get(d);
    });
    return fac(ctxt, deps);
  }

  create(typ: Typing) {
    const o = Object.create(typ.prototype);
    const r = this.invoke(typ, o);
    return typeof r === "object" ? r : o;
  }

  error(msg: string) {
    const m = this._resolving.join(" -> ");
    this._resolving.length = 0;
    return new Error(m ? `${msg} (Resolving: ${m})` : msg);
  }
}
