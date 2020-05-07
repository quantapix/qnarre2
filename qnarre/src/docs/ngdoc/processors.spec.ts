let mockPackage = require("../mocks/mockPackage");
let Dgeni = require("dgeni");

describe("collectKnownIssuesProcessor", () => {
  let processor, moduleMap;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const injector = dgeni.configureInjector();
    processor = injector.get("collectKnownIssuesProcessor");
  });

  it("should add API docs that have known issues to their module doc", () => {
    const module1 = {};
    const module2 = {};
    const docs = [
      {
        id: "doc-with-issues-1",
        moduleDoc: module1,
        knownIssues: ["issue 1", "issue 2"]
      },
      { id: "doc-with-empty-issues", moduleDoc: module1, knownIssues: [] },
      { id: "doc-with-no-issues", moduleDoc: module2 },
      {
        id: "doc-with-issues-1",
        moduleDoc: module2,
        knownIssues: ["issue 3", "issue 4"]
      }
    ];
    processor.$process(docs);
    expect(module1).toEqual({ knownIssueDocs: [docs[0]] });
    expect(module2).toEqual({ knownIssueDocs: [docs[3]] });
  });
});

function createMockTagCollection(tags) {
  return {
    getTag(value) {
      return tags[value];
    }
  };
}

describe("filter-ngdocs doc-processor plugin", () => {
  let processor;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const injector = dgeni.configureInjector();
    processor = injector.get("filterNgDocsProcessor");
  });

  it("should only return docs that have the ngdoc tag", () => {
    const doc1 = { tags: createMockTagCollection({ ngdoc: "a" }) };
    const doc2 = { tags: createMockTagCollection({ other: "b" }) };
    const doc3 = { tags: createMockTagCollection({ ngdoc: "c", other: "d" }) };
    const doc4 = { tags: createMockTagCollection({}) };
    const docs = [doc1, doc2, doc3, doc4];
    const filteredDocs = processor.$process(docs);
    expect(filteredDocs).toEqual([doc1, doc3]);
  });
});

describe("generateComponentGroupsProcessor", () => {
  let processor, moduleMap;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const injector = dgeni.configureInjector();
    processor = injector.get("generateComponentGroupsProcessor");
    moduleMap = injector.get("moduleMap");
  });

  it("should create a new doc for each group of components (by docType) in each module", () => {
    const docs = [];
    moduleMap.set("mod1", {
      id: "mod1",
      name: "mod1",
      components: [
        { docType: "a", id: "a1" },
        { docType: "a", id: "a2" },
        { docType: "a", id: "a3" },
        { docType: "a", id: "a4" },
        { docType: "b", id: "b1" },
        { docType: "b", id: "b2" },
        { docType: "b", id: "a3" }
      ]
    });
    processor.$process(docs);
    expect(docs.length).toEqual(2);
    expect(docs[0].name).toEqual("a components in mod1");
    expect(docs[0].moduleName).toEqual("mod1");
    expect(docs[0].moduleDoc).toEqual(jasmine.objectContaining({ id: "mod1" }));
    expect(docs[1].name).toEqual("b components in mod1");
    expect(docs[1].moduleName).toEqual("mod1");
    expect(docs[1].moduleDoc).toEqual(jasmine.objectContaining({ id: "mod1" }));
  });

  it("should not generate componentGroup docs for the 'overview' docType", () => {
    moduleMap.set("mod1", {
      id: "mod1",
      name: "mod1",
      components: [
        { docType: "overview", id: "a1" },
        { docType: "a", id: "a1" }
      ]
    });
    const docs = [];
    processor.$process(docs);
    expect(docs.length).toEqual(1);
    expect(docs[0].name).toEqual("a components in mod1");
  });

  it("should attach the componentGroup to its module", () => {
    moduleMap.set("mod1", {
      id: "mod1",
      name: "mod1",
      components: [
        { docType: "a", id: "a1" },
        { docType: "a", id: "a2" },
        { docType: "a", id: "a3" },
        { docType: "a", id: "a4" },
        { docType: "b", id: "b1" },
        { docType: "b", id: "b2" },
        { docType: "b", id: "a3" }
      ]
    });
    const docs = [];
    processor.$process(docs);
    const componentGroups = moduleMap.get("mod1").componentGroups;
    expect(componentGroups.length).toEqual(2);
    expect(componentGroups[0].name).toEqual("a components in mod1");
  });
});

describe("memberDocsProcessor", () => {
  let processor, aliasMap, mockLog;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const injector = dgeni.configureInjector();
    processor = injector.get("memberDocsProcessor");
    aliasMap = injector.get("aliasMap");
    mockLog = injector.get("log");
  });

  it("should remove docs that are members of container docs", () => {
    const doc1 = {
      id: "module:ng.service:$log",
      aliases: [
        "$log",
        "service:$log",
        "ng.$log",
        "module:ng.service:$log",
        "ng.service:$log"
      ]
    };
    const doc2 = {
      id: "module:ngMock.service:$log",
      aliases: [
        "$log",
        "service:$log",
        "ngMock.$log",
        "module:ngMock.service:$log",
        "ngMock.service:$log"
      ]
    };
    const doc3 = { id: "ng.$log#warn" };
    let docs = [doc1, doc2, doc3];
    aliasMap.addDoc(doc1);
    aliasMap.addDoc(doc2);
    docs = processor.$process(docs);
    expect(docs).toEqual([doc1, doc2]);
  });

  it("should connect member docs to their container doc", () => {
    const doc1 = {
      id: "module:ng.service:$log",
      aliases: [
        "$log",
        "service:$log",
        "ng.$log",
        "module:ng.service:$log",
        "ng.service:$log"
      ]
    };
    const doc2 = {
      id: "module:ngMock.service:$log",
      aliases: [
        "$log",
        "service:$log",
        "ngMock.$log",
        "module:ngMock.service:$log",
        "ngMock.service:$log"
      ]
    };
    const doc3 = { id: "ng.$log#warn", docType: "method" };
    let docs = [doc1, doc2, doc3];
    aliasMap.addDoc(doc1);
    aliasMap.addDoc(doc2);
    docs = processor.$process(docs);
    expect(doc3.name).toEqual("warn");
    expect(doc3.memberof).toEqual("module:ng.service:$log");
    expect(doc1.methods).toEqual([doc3]);
    expect(doc2.methods).not.toEqual([doc3]);
  });

  it("should attempt to match the container by using the member's module", () => {
    const doc1 = {
      module: "ng",
      id: "module:ng.service:$log",
      aliases: [
        "$log",
        "service:$log",
        "ng.$log",
        "module:ng.service:$log",
        "ng.service:$log"
      ]
    };
    const doc2 = {
      module: "ngMock",
      id: "module:ngMock.service:$log",
      aliases: [
        "$log",
        "service:$log",
        "ngMock.$log",
        "module:ngMock.service:$log",
        "ngMock.service:$log"
      ]
    };
    const doc3 = { module: "ngMock", id: "$log#warn", docType: "method" };
    aliasMap.addDoc(doc1);
    aliasMap.addDoc(doc2);
    processor.$process([doc3]);
    expect(doc3.memberof).toEqual("module:ngMock.service:$log");
    expect(doc2.methods).toEqual([doc3]);
    expect(doc1.methods).not.toEqual([doc3]);
  });

  it("should warn if the container doc does not exist or is ambiguous", () => {
    const doc1 = {
      module: "ng",
      id: "module:ng.service:orderBy",
      aliases: [
        "orderBy",
        "service:orderBy",
        "ng.orderBy",
        "module:ng.service:orderBy",
        "ng.service:orderBy"
      ]
    };
    const doc2 = {
      module: "ng",
      id: "module:ng.filter:orderBy",
      aliases: [
        "orderBy",
        "filter:orderBy",
        "ng.orderBy",
        "module:ng.filter:orderBy",
        "ng.service:orderBy"
      ]
    };
    const doc3 = { module: "ng", id: "ng.$http#get", docType: "method" };
    const doc4 = { module: "ng", id: "orderBy#doIt", docType: "method" };
    aliasMap.addDoc(doc1);
    aliasMap.addDoc(doc2);
    processor.$process([doc3]);
    expect(mockLog.warn).toHaveBeenCalled();
    expect(mockLog.warn.calls.mostRecent().args[0]).toMatch(
      /Missing container document/
    );
    mockLog.warn.calls.reset();
    processor.$process([doc4]);
    expect(mockLog.warn).toHaveBeenCalled();
    expect(mockLog.warn.calls.mostRecent().args[0]).toMatch(
      /Ambiguous container document reference/
    );
  });
});

describe("moduleDocsProcessor", () => {
  let processor, aliasMap, moduleMap;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const injector = dgeni.configureInjector();
    processor = injector.get("moduleDocsProcessor");
    moduleMap = injector.get("moduleMap");
    aliasMap = injector.get("aliasMap");
  });

  it("should compute the package name and filename for the module", () => {
    const doc1 = { docType: "module", name: "ng", id: "module:ng" };
    const doc2 = { docType: "module", name: "ngRoute", id: "module:ngRoute" };
    const doc3 = {
      docType: "module",
      name: "ngMock",
      id: "module:ngMock",
      packageName: "angular-mocks"
    };
    processor.$process([doc1, doc2, doc3]);
    expect(doc1.packageName).toEqual("angular");
    expect(doc1.packageFile).toEqual("angular.js");
    expect(doc2.packageName).toEqual("angular-route");
    expect(doc2.packageFile).toEqual("angular-route.js");
    expect(doc3.packageName).toEqual("angular-mocks");
    expect(doc3.packageFile).toEqual("angular-mocks.js");
  });

  it("should add module docs to the moduleMap", () => {
    const doc1 = { docType: "module", id: "ng" };
    const doc2 = { docType: "module", id: "ngMock" };
    const doc3 = { docType: "service", module: "ng", id: "ng.$http" };
    processor.$process([doc1, doc2, doc3]);
    expect(moduleMap.values().length).toEqual(2);
    expect(moduleMap.get("ng")).toBe(doc1);
    expect(moduleMap.get("ngMock")).toBe(doc2);
  });

  it("should connect all docs to their module", () => {
    const doc1 = { docType: "module", id: "ng", aliases: ["ng"] };
    const doc2 = { docType: "module", id: "ngMock", aliases: ["ngMock"] };
    const doc3 = { docType: "service", module: "ng", id: "ng.$http" };
    const doc4 = { docType: "service", module: "ng", id: "ng.$log" };
    const doc5 = { docType: "service", module: "ngMock", id: "ng.$log" };
    aliasMap.addDoc(doc1);
    aliasMap.addDoc(doc2);
    processor.$process([doc1, doc2, doc3, doc4, doc5]);
    expect(doc1.components).toEqual([doc3, doc4]);
    expect(doc2.components).toEqual([doc5]);
    expect(doc3.moduleDoc).toBe(doc1);
    expect(doc4.moduleDoc).toBe(doc1);
    expect(doc5.moduleDoc).toBe(doc2);
  });

  it("should complain if their is more than one matching modules", () => {
    const doc1 = {
      docType: "module",
      id: "module:app.mod1",
      aliases: [
        "app",
        "app.mod1",
        "mod1",
        "module:app",
        "module:app.mod1",
        "module:mod1"
      ]
    };
    const doc2 = {
      docType: "module",
      id: "module:app.mod2",
      aliases: [
        "app",
        "app.mod2",
        "mod2",
        "module:app",
        "module:app.mod2",
        "module:mod2"
      ]
    };
    const doc3 = { docType: "service", module: "app", id: "app.service" };
    aliasMap.addDoc(doc1);
    aliasMap.addDoc(doc2);
    expect(() => {
      processor.$process([doc1, doc2, doc3]);
    }).toThrowError(
      'Ambiguous module reference: "app" - doc "app.service" (service) \n' +
        "Matching modules:\n" +
        "- module:app.mod1\n" +
        "- module:app.mod2\n"
    );
  });

  it("should try using the module specifier if the module reference is ambiguous", () => {
    const doc1 = {
      docType: "module",
      id: "module:ngMessages",
      aliases: ["ngMessages", "module:ngMessages"]
    };
    const doc2 = {
      docType: "directive",
      module: "ngMessages",
      id: "module:ngMessages.directive:ngMessages",
      aliases: [
        "ngMessages.ngMessages",
        "module:ngMessages.ngMessages",
        "ngMessages.directive:ngMessages",
        "module:ngMessages.directive:ngMessages",
        "directive:ngMessages",
        "ngMessages"
      ]
    };
    aliasMap.addDoc(doc1);
    aliasMap.addDoc(doc2);
    processor.$process([doc1, doc2]);
    expect(doc2.moduleDoc).toBe(doc1);
  });

  it("should throw an error if a module is documented as another type of entity", () => {
    let doc1 = {
      docType: "module",
      name: "mod1",
      id: "module:mod1",
      aliases: ["mod1", "module:mod1"]
    };
    const doc1 = {
      docType: "object",
      name: "mod2",
      id: "object:mod2",
      aliases: ["mod2", "object:mod2"]
    };
    const doc2 = {
      docType: "service",
      name: "service1",
      module: "mod1",
      id: "mod1.service1"
    };
    const doc3 = {
      docType: "service",
      name: "service2",
      module: "mod2",
      id: "mod2.service2"
    };
    aliasMap.addDoc(doc1);
    expect(() => {
      processor.$process([doc1, doc2, doc3]);
    }).toThrowError(
      '"mod2" is not a module. It is documented as "object". Either the module is incorrectly typed or the module reference is invalid - doc "mod2.service2" (service) '
    );
  });
});

describe("providerDocsProcessor", () => {
  let processor, aliasMap, mockLog;

  beforeEach(() => {
    const dgeni = new Dgeni([mockPackage()]);
    const injector = dgeni.configureInjector();
    processor = injector.get("providerDocsProcessor");
    aliasMap = injector.get("aliasMap");
    mockLog = injector.get("log");
  });

  it("should connect all services docs to their provider docs", () => {
    const doc1 = {
      docType: "provider",
      id: "provider:$httpProvider",
      aliases: ["provider:$httpProvider"]
    };
    const doc2 = {
      docType: "provider",
      id: "provider:$logProvider",
      aliases: ["provider:$logProvider"]
    };
    const doc3 = {
      docType: "service",
      id: "service:$http",
      aliases: ["service:$http"]
    };
    const doc4 = {
      docType: "service",
      id: "service:$log",
      aliases: ["service:$log"]
    };
    const doc5 = {
      docType: "service",
      id: "service:$filter",
      aliases: ["service:$filter"]
    };
    aliasMap.addDoc(doc1);
    aliasMap.addDoc(doc2);
    aliasMap.addDoc(doc3);
    aliasMap.addDoc(doc4);
    aliasMap.addDoc(doc5);
    processor.$process([doc1, doc2, doc3, doc4, doc5]);
    expect(doc1.serviceDoc).toBe(doc3);
    expect(doc2.serviceDoc).toBe(doc4);
    expect(doc3.providerDoc).toBe(doc1);
    expect(doc4.providerDoc).toBe(doc2);
    expect(doc5.providerDoc).toBeUndefined();
  });

  it("should log a warning if their is more than one matching service", () => {
    const doc1 = {
      docType: "provider",
      id: "provider:$httpProvider",
      aliases: ["provider:$httpProvider"]
    };
    const doc2 = {
      docType: "service",
      id: "service:$http",
      aliases: ["service:$http"]
    };
    const doc3 = {
      docType: "service",
      id: "service:$http",
      aliases: ["service:$http"]
    };
    aliasMap.addDoc(doc1);
    aliasMap.addDoc(doc2);
    aliasMap.addDoc(doc3);
    processor.$process([doc1, doc2, doc3]);
    expect(mockLog.warn).toHaveBeenCalledWith(
      'Ambiguous service name "service:$http" for provider - doc "provider:$httpProvider" (provider) \n' +
        "Matching docs: \n" +
        '  "service:$http"\n' +
        '  "service:$http"'
    );
  });

  it("should complain if there is no service for a provider", () => {
    const doc1 = {
      docType: "provider",
      id: "provider:$httpProvider",
      aliases: ["provider:$httpProvider"]
    };
    aliasMap.addDoc(doc1);
    processor.$process([doc1]);
    expect(mockLog.warn).toHaveBeenCalledWith(
      'Missing service "service:$http" for provider - doc "provider:$httpProvider" (provider) '
    );
  });
});
