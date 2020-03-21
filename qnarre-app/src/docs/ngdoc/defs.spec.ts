import path from "path";
const tagDefFactory = require("./area");

describe("area tag-def", () => {
  it("should set default based on fileType", () => {
    const tagDef = tagDefFactory();
    expect(tagDef.defaultFn({ fileInfo: { extension: "js" } })).toEqual("api");
    expect(
      tagDef.defaultFn({ fileInfo: { relativePath: "guide/concepts.ngdoc" } })
    ).toEqual("guide");
  });
});

let tagDefFactory = require("./element");

describe("element tag-def", () => {
  it("should set default based on docType", () => {
    const tagDef = tagDefFactory();
    expect(tagDef.defaultFn({ docType: "directive" })).toEqual("ANY");
    expect(tagDef.defaultFn({ docType: "input" })).toEqual("ANY");
    expect(tagDef.defaultFn({ docType: "service" })).toBeUndefined();
  });
});

let tagDefFactory = require("./eventType");

describe("eventType tag-def", () => {
  it("should split into eventType and eventTarget", () => {
    const doc = {},
      tag = {};
    const tagDef = tagDefFactory();
    const value = tagDef.transforms(
      doc,
      tag,
      "broadcast on module:ng.directive:ngInclude"
    );
    expect(value).toEqual("broadcast");
    expect(doc.eventTarget).toEqual("module:ng.directive:ngInclude");
  });
});

const path = require("canonical-path");
let tagDefFactory = require("./module");

describe("module tag-def", () => {
  it("should calculate the module from the second segment of the file path", () => {
    const tagDef = tagDefFactory();
    expect(
      tagDef.defaultFn({
        area: "api",
        fileInfo: { relativePath: "ng/service/$http.js" }
      })
    ).toEqual("ng");
  });

  it("should use the relative file path", () => {
    const tagDef = tagDefFactory();
    const relativePath = "ng/service/$http.js";
    expect(
      tagDef.defaultFn({
        area: "api",
        fileInfo: {
          filePath: path.resolve(relativePath),
          relativePath
        }
      })
    ).toEqual("ng");
  });

  it("should not calculate module if the doc is not in 'api' area", () => {
    const tagDef = tagDefFactory();
    const relativePath = "guide/concepts.ngdoc";
    expect(
      tagDef.defaultFn({
        area: "guide",
        fileInfo: {
          filePath: path.resolve(relativePath),
          relativePath
        }
      })
    ).toBeUndefined();
  });

  it("should not calculate module if the doc has docType 'overview'", () => {
    const tagDef = tagDefFactory();
    const relativePath = "api/index.ngdoc";
    expect(
      tagDef.defaultFn({
        docType: "overview",
        area: "api",
        fileInfo: {
          filePath: path.resolve(relativePath),
          relativePath
        }
      })
    ).toBeUndefined();
  });
});

let tagDefFactory = require("./multiElement");

describe("scope tag-def", () => {
  it("should transform the value to true", () => {
    const tagDef = tagDefFactory();
    expect(tagDef.transforms()).toEqual(true);
  });
});

const mockPackage = require("../mocks/mockPackage");
let Dgeni = require("dgeni");

let tagDefFactory = require("./name");

describe("name tag-def", () => {
  let tagDef;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const injector = dgeni.configureInjector();
    tagDef = injector.invoke(tagDefFactory);
  });

  it("should update the inputType if docType is input", () => {
    const doc = { docType: "input" };
    const tag = {};
    const value = tagDef.transforms(doc, tag, "input[checkbox]");
    expect(value).toEqual("input[checkbox]");
    expect(doc.inputType).toEqual("checkbox");
  });

  it("should not update the inputType if docType is not input", () => {
    const doc = { docType: "directive" };
    const tag = {};
    const value = tagDef.transforms(doc, tag, "input[checkbox]");
    expect(value).toEqual("input[checkbox]");
    expect(doc.inputType).toBeUndefined();
  });

  it("should throw error if the docType is 'input' and the name is not a valid format", () => {
    const doc = { docType: "input" };
    const tag = {};
    expect(() => {
      tagDef.transforms(doc, tag, "invalidInputName");
    }).toThrow();
  });
});

let tagDefFactory = require("./restrict");

describe("restrict tag-def", () => {
  let tagDef;

  beforeEach(() => {
    tagDef = tagDefFactory();
  });

  it("should convert a restrict tag text to an object", () => {
    expect(tagDef.transforms({}, {}, "A")).toEqual({
      element: false,
      attribute: true,
      cssClass: false,
      comment: false
    });
    expect(tagDef.transforms({}, {}, "C")).toEqual({
      element: false,
      attribute: false,
      cssClass: true,
      comment: false
    });
    expect(tagDef.transforms({}, {}, "E")).toEqual({
      element: true,
      attribute: false,
      cssClass: false,
      comment: false
    });
    expect(tagDef.transforms({}, {}, "M")).toEqual({
      element: false,
      attribute: false,
      cssClass: false,
      comment: true
    });
    expect(tagDef.transforms({}, {}, "ACEM")).toEqual({
      element: true,
      attribute: true,
      cssClass: true,
      comment: true
    });
  });

  it("should default to restricting to an element and attribute if no tag is found and the doc is for a directive", () => {
    expect(tagDef.defaultFn({ docType: "directive" })).toEqual({
      element: true,
      attribute: true,
      cssClass: false,
      comment: false
    });
    expect(tagDef.defaultFn({ docType: "input" })).toEqual({
      element: true,
      attribute: true,
      cssClass: false,
      comment: false
    });
  });

  it("should not add a restrict property if the docType is not 'directive'", () => {
    expect(tagDef.defaultFn({ docType: "service" })).toBeUndefined();
  });
});

const tagDefFactory = require("./scope");

describe("scope tag-def", () => {
  it("should transform the value to true", () => {
    const tagDef = tagDefFactory();
    expect(tagDef.transforms()).toEqual(true);
  });
});
