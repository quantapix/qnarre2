import winston from "winston";
import { Factory, sortByDeps, injFactory, logFactory } from "./utils";

interface Item {
  name: string;
  after?: any;
  before?: any;
}

describe("sortByDeps", () => {
  it("should sort collection by deps", () => {
    const items = new Map<string, Item>([
      ["b", { name: "b", before: ["c"], after: ["a"] }],
      ["c", { name: "c" }],
      ["a", { name: "a" }]
    ]);
    const sorted = sortByDeps(items, "after", "before");
    expect(sorted[0].name).toEqual("a");
    expect(sorted[1].name).toEqual("b");
    expect(sorted[2].name).toEqual("c");
  });

  it("should error if a dep is missing", () => {
    expect(() =>
      sortByDeps(
        new Map<string, Item>([["a", { name: "a", after: ["missing"] }]]),
        "after"
      )
    ).toThrow();
    expect(() =>
      sortByDeps(
        new Map<string, Item>([["a", { name: "a", before: ["missing"] }]]),
        undefined,
        "before"
      )
    ).toThrow();
  });

  it("should error if either before or after props are not arrays", () => {
    expect(() =>
      sortByDeps(
        new Map<string, Item>([["a", { name: "a", after: "not array" }]]),
        "after"
      )
    ).toThrow();
    expect(() =>
      sortByDeps(
        new Map<string, Item>([["a", { name: "a", before: "not array" }]]),
        undefined,
        "before"
      )
    ).toThrow();
  });

  it("should error if there is a dependency cycle", () => {
    expect(() =>
      sortByDeps(
        new Map<string, Item>([
          ["a", { name: "a", after: "b" }],
          ["b", { name: "b", after: "a" }]
        ]),
        "after"
      )
    ).toThrow();
  });
});

describe("injFactory", () => {
  let inj: { invoke: any };
  let fac: Factory;

  beforeEach(() => {
    inj = { invoke: (f: () => any) => f() };
    fac = injFactory(inj);
  });

  it("should call invoke on the injector for each factory", () => {
    function a() {
      return {};
    }
    function b() {
      return {};
    }
    function c() {
      return {};
    }
    spyOn(inj, "invoke");
    fac([a, b, c]);
    expect(inj.invoke).toHaveBeenCalledTimes(3);
  });

  it("should get the name from the instance, then the factory", () => {
    function a() {
      return {};
    }
    function b() {
      return function b2() {
        /* */
      };
    }
    function c() {
      return { name: "c2" };
    }
    const rs = fac([a, b, c]);
    expect(rs[0].name).toEqual("a");
    expect(rs[1].name).toEqual("b2");
    expect(rs[2].name).toEqual("c2");
  });
});

describe("logFactory", () => {
  it("should wrap the winston library", () => {
    logFactory();
    expect(winston.level).toEqual("info");
  });
});
