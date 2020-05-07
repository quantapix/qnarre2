import { code, link, typeClass } from "./filters";

describe("code custom filter", () => {
  let codeFilter, codeSpy;

  beforeEach(() => {
    codeSpy = jasmine.createSpy("code").and.callFake(value => {
      return "<code>" + value + "</code>";
    });
    codeFilter = code(codeSpy);
  });

  it("should have the name 'code'", () => {
    expect(codeFilter.name).toEqual("code");
  });

  it("should call the code utility", () => {
    codeFilter.process("function foo() { }");
    expect(codeSpy).toHaveBeenCalledWith("function foo() { }", true, undefined);
  });

  it("should pass the language to the code utility", () => {
    codeFilter.process("function foo() { }", "js");
    expect(codeSpy).toHaveBeenCalledWith("function foo() { }", true, "js");
  });
});

describe("link filter", () => {
  let filter;

  beforeEach(() => {
    filter = link();
  });

  it("should have the name 'link'", () => {
    expect(filter.name).toEqual("link");
  });

  it("should inject an inline link tag", () => {
    expect(filter.process("URL", "TITLE")).toEqual("{@link URL TITLE }");
  });
});

describe("type-class filter", () => {
  it("should call getTypeClass", () => {
    const getTypeClassSpy = jasmine.createSpy("getTypeClass");
    const filter = typeClass(getTypeClassSpy);
    filter.process("object");
    expect(getTypeClassSpy).toHaveBeenCalled();
  });
});
