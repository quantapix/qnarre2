import { Processor, ProcessorDef, Package } from "./package";

describe("Package", () => {
  describe("constructor()", () => {
    it("should complain if no name is given", () => {
      expect(() => {
        return new Package(["dep1", "dep2"] as any);
      }).toThrow();
    });

    it("should add dependencies, if provided", () => {
      const p = new Package("pkg", ["dep1", "dep2"]);
      expect(p.deps).toEqual(["dep1", "dep2"]);
    });

    it("should create an empty dependencies collection if no dependencies are provided", () => {
      const p = new Package("pkg");
      expect(p.deps).toEqual([]);
    });

    it("should complain if dependencies is not an array", () => {
      expect(() => {
        return new Package("somePackage", {
          /* */
        } as any);
      }).toThrow();
    });
  });

  describe("isPackage", () => {
    it("should return true for instances of Package", () => {
      const p = new Package("pkg", ["dep1"]);
      expect(Package.isPackage(p)).toEqual(true);
    });

    it("should return true for pkg-like objects", () => {
      const p = {
        name: "pkg",
        module: {
          /* */
        },
        deps: ["dep1"]
      };
      expect(Package.isPackage(p)).toEqual(true);
    });

    it("should return false for non-pkg-like objects", () => {
      const p = {
        name: "pkg",
        // module: { /* */ },
        deps: ["dep1"]
      };
      expect(Package.isPackage(p)).toEqual(false);
    });

    it("should return false if passed a non-object", () => {
      const p = "pkg";
      expect(Package.isPackage(p)).toEqual(false);
    });
  });

  describe("processor()", () => {
    it("should add processors defined by an object to the processors property", () => {
      const p = new Package("pkg");
      p.addProcessor({ name: "proc" } as Processor);
      expect(p.procs[0]).toEqual("proc");
    });

    it("should add processors defined by a factory function to the processors property", () => {
      const p = new Package("pkg");
      p.addProcessor(function proc() {
        /* */
      } as ProcessorDef);
      expect(p.procs[0]).toEqual("proc");
    });

    it("should complain if the processorFactory does not have a name", () => {
      const p = new Package("pkg");
      expect(() => {
        p.addProcessor((() => {
          /* */
        }) as ProcessorDef);
      }).toThrow();
      expect(() => {
        p.addProcessor({ missing: "name" } as any);
      }).toThrow();
    });

    it("should use the first param as the name if it is a string", () => {
      const p = new Package("pkg");
      p.addProcessor("proc", {
        $process() {
          /* */
        }
      } as any);
      expect(p.procs[0]).toEqual("proc");
    });

    it("should add the processor to the DI module", () => {
      const p = new Package("pkg");
      const tp = function proc() {
        /* */
      };
      p.addProcessor(tp as ProcessorDef);
      expect(p.module.get("proc")).toEqual(["factory", tp]);
    });
  });

  describe("factory()", () => {
    it("should complain if the factory is not a function", () => {
      const p = new Package("pkg");
      expect(() => p.addFactory({ name: "bad factory" } as any)).toThrow();
    });

    it("should complain if the factory does not have a name", () => {
      const p = new Package("pkg");
      expect(() =>
        p.addFactory(() => {
          /* */
        })
      ).toThrow();
    });

    it("should use the first param as the name if it is a string", () => {
      const p = new Package("pkg");
      const tsf = () => {
        /* */
      };
      p.addFactory("service", tsf);
      expect(p.module.get("service")).toEqual(["factory", tsf]);
    });

    it("should add the service to the DI module", () => {
      const p = new Package("pkg");
      const ts = function service() {
        /* */
      };
      p.addFactory(ts);
      expect(p.module.get("service")).toEqual(["factory", ts]);
    });
  });

  describe("type()", () => {
    it("should complain if the constructor is not a function", () => {
      const p = new Package("pkg");
      expect(() => p.addType({ name: "bad type" } as any)).toThrow();
    });

    it("should complain if the constructor does not have a name", () => {
      const p = new Package("pkg");
      expect(() =>
        p.addType(() => {
          /* */
        })
      ).toThrow();
    });

    it("should use the first param as the name if it is a string", () => {
      const p = new Package("pkg");
      const ts = () => {
        /* */
      };
      p.addType("service", ts);
      expect(p.module.get("service")).toEqual(["type", ts]);
    });

    it("should add the service to the DI module", () => {
      const pkg = new Package("pkg");
      const ts = function service() {
        /* */
      };
      pkg.addType(ts);
      expect(pkg.module.get("service")).toEqual(["type", ts]);
    });
  });

  describe("config()", () => {
    it("should add the function to the configFns property", () => {
      const p = new Package("pkg");
      const tf = (_: string) => {
        /* */
      };
      p.addConfig(tf);
      expect(p.configs[0]).toEqual(tf);
    });

    it("should complain if configFn is not a function", () => {
      const p = new Package("pkg");
      expect(() => {
        p.addConfig({ some: "non-function" } as any);
      }).toThrow();
    });
  });

  describe("eventHandlers()", () => {
    it("should add eventHandler name defined by a factory function to the handlers property", () => {
      const p = new Package("pkg");
      p.addHandler("event", function handler() {
        /* */
      });
      expect(p.handlers.get("event")).toEqual(["handler"]);
    });

    it("should compute a unique name for the handler if it doesn't have one", () => {
      const p = new Package("pkg");
      p.addHandler("event", () => {
        /* */
      });
      expect(p.handlers.get("event")![0]).toEqual("pkg_event_0");
      p.addHandler("event", () => {
        /* */
      });
      expect(p.handlers.get("event")![1]).toEqual("pkg_event_1");
    });

    it("should complain if the handler is not a function", () => {
      const p = new Package("pkg");
      expect(() =>
        p.addHandler("event", { name: "bad handler" } as any)
      ).toThrow();
    });

    it("should add the eventHandler to the DI module", () => {
      const p = new Package("pkg");
      const h = function handler() {
        /* */
      };
      p.addHandler("event", h);
      expect(p.module.get("handler")).toEqual(["factory", h]);
      p.addHandler("event", () => {
        /* */
      });
      const f = p.module.get("pkg_event_1")!;
      expect(f[0]).toEqual("factory");
      expect(typeof f[1]).toBe("function");
    });
  });
});
