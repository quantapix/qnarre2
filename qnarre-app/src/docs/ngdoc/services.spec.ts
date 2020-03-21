import getTypeClass = require("./services");

describe("getTypeClass", () => {
  it("should convert the type name to a css string", () => {
    const typeClass = getTypeClass();
    expect(typeClass("string")).toEqual("label type-hint type-hint-string");
    expect(typeClass("Object")).toEqual("label type-hint type-hint-object");
    expect(typeClass("")).toEqual("label type-hint type-hint-object");
    expect(typeClass("function() {}")).toEqual(
      "label type-hint type-hint-function"
    );
    expect(typeClass("array.<string>")).toEqual(
      "label type-hint type-hint-array"
    );
  });
});
