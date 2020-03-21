import { assert, Action, Factory } from "./utils";
import { Typing, Module } from "./injector";

export interface Doc {
  area: any;
  module: any;
  codeName: string;
  startingLine: any;
  endingLine: any;
  renderedContent: any;
  name?: string;
  path?: string;
  outputPath?: string;
  id?: string;
  aliases?: string;
  docType?: string;
  fileInfo?: any;
}

export interface Template {
  getId: any;
  idTemplate: any;
  getAliases: any;
  docTypes: any;
  getPath: any;
  pathTemplate: any;
  getOutputPath: any;
  outputPathTemplate: any;
}

export interface Processor {
  name: string;
  $runAfter?: string[];
  $runBefore?: string[];
  $process?(ds: Doc[]): Doc[] | PromiseLike<Doc[]> | void;
  $package?: string;
  $enabled?: boolean;
  description?: string;
}

export type ProcessorDef = Processor | Factory;

export class Package {
  static isPackage(pkg: any): pkg is Package {
    return (
      typeof pkg.name === "string" &&
      Array.isArray(pkg.deps) &&
      typeof pkg.module === "object"
    );
  }

  module: Module = new Map();
  configs: Action[] = [];
  procs: string[] = [];
  handlers = new Map<string, string[]>();
  refs: string[] = [];

  constructor(public name: string, public deps: (string | Package)[] = []) {
    assert(typeof name === "string");
    assert(Array.isArray(deps));
  }

  addProcessor(name: string | ProcessorDef, def?: ProcessorDef) {
    if (typeof name !== "string") {
      def = name;
      assert(def.name && typeof def.name === "string");
      name = def.name;
    }
    if (typeof def === "function") {
      this.module.set(name, ["factory", def]);
    } else {
      this.module.set(name, ["value", def]);
    }
    this.procs.push(name);
    return this;
  }

  addFactory(name: string | Factory, fac?: Factory) {
    if (typeof name !== "string") {
      fac = name;
      assert(fac.name && typeof fac.name === "string");
      name = fac.name;
    }
    assert(typeof fac === "function");
    this.module.set(name, ["factory", fac]);
    return this;
  }

  addType(name: string | Typing, typ?: Typing) {
    if (typeof name !== "string") {
      typ = name;
      assert(typ.name && typeof typ.name === "string");
      name = typ.name;
    }
    assert(typeof typ === "function");
    this.module.set(name, ["typing", typ]);
    return this;
  }

  addConfig(cfg: (...xs: any[]) => void) {
    assert(typeof cfg === "function");
    this.configs.push(cfg);
    return this;
  }

  addHandler(name: string, fac: Factory) {
    const hs: string[] = this.handlers.get(name) || [];
    this.handlers.set(name, hs);
    const n = fac.name || this.name + "_" + name + "_" + hs.length;
    this.addFactory(n, fac);
    hs.push(n);
    return this;
  }
}
