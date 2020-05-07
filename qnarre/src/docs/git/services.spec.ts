var decorateVersion = require("./decorateVersion")();
var semver = require("semver");

describe("decorateVersion", function() {
  it("should be a function", function() {
    expect(decorateVersion).toEqual(jasmine.any(Function));
  });

  it("should set the docsUrl", function() {
    var version = semver.parse("5.5.5");

    decorateVersion(version);
    expect(version.docsUrl).toBeDefined();
    expect(version.isOldDocsUrl).toBeUndefined();
  });

  describe("semantic version", function() {
    it("should be true for 1.2.0 not rc1 prerelease", function() {
      var version = semver.parse("1.2.0-build");
      expect(version.prerelease).toEqual(["build"]);

      decorateVersion(version);

      expect(semver.parse(version.raw)).not.toEqual(null);
      expect(semver.parse(version.version)).not.toEqual(null);
    });

    it("should be true for 1.0.x w/o prerelease", function() {
      var version = semver.parse("1.0.0+rc1.build");

      decorateVersion(version);

      expect(semver.parse(version.raw)).not.toEqual(null);
      expect(semver.parse(version.version)).not.toEqual(null);
    });

    it("should be false for 1.0.x with prerelease", function() {
      var version = semver.parse("1.0.0-rc1.build");
      expect(version.prerelease).toEqual(["rc1", "build"]);

      decorateVersion(version);

      expect(semver.parse(version.raw)).toEqual(null);
      expect(semver.parse(version.version)).toEqual(null);
    });

    it("should be false for 1.2.0rc1", function() {
      var version = semver.parse("1.2.0-rc1.build");
      expect(version.prerelease).toEqual(["rc1", "build"]);

      decorateVersion(version);

      expect(semver.parse(version.raw)).toEqual(null);
      expect(semver.parse(version.version)).toEqual(null);
    });
  });

  describe("isOldDocsUrl", function() {
    it("should not be set for 1.0.2", function() {
      var version = semver.parse("1.0.2");
      decorateVersion(version);
      expect(version.isOldDocsUrl).toBeUndefined();
    });

    it("should be set for version < 1", function() {
      var version = semver.parse("0.0.2");
      decorateVersion(version);
      expect(version.isOldDocsUrl).toBe(true);
    });

    it("should be set for version < 1.0.2", function() {
      var version = semver.parse("1.0.1");
      decorateVersion(version);
      expect(version.isOldDocsUrl).toBe(true);
    });
  });
});

var rewire = require("rewire");
var semver = require("semver");
var getPreviousVersionsFactory = rewire("./getPreviousVersions");
var Dgeni = require("dgeni");

var mocks = require("../mocks/mocks.js");
var mockPackageFactory = require("../mocks/mockPackage");

describe("getPreviousVersions", function() {
  var getPreviousVersions, child;

  beforeEach(function() {
    child = getPreviousVersionsFactory.__get__("child");

    var mockPackage = mockPackageFactory().factory(getPreviousVersionsFactory);

    var dgeni = new Dgeni([mockPackage]);

    var injector = dgeni.configureInjector();
    getPreviousVersions = injector.get("getPreviousVersions");
  });

  it("should have called exec", function() {
    spyOn(child, "spawnSync").and.returnValue({});
    getPreviousVersions();
    expect(child.spawnSync).toHaveBeenCalled();
  });

  it("should return an empty list for no tags", function() {
    spyOn(child, "spawnSync").and.returnValue({});
    expect(getPreviousVersions()).toEqual([]);
  });

  it("should return an array of semvers matching tags", function() {
    spyOn(child, "spawnSync").and.returnValue({
      status: 0,
      stdout: "v0.1.1"
    });
    expect(getPreviousVersions()).toEqual([semver("v0.1.1")]);
  });

  it("should match v0.1.1-rc1", function() {
    spyOn(child, "spawnSync").and.returnValue({
      status: 0,
      stdout: "v0.1.1-rc1"
    });
    expect(getPreviousVersions()).toEqual([semver("v0.1.1-rc1")]);
  });

  it("should not match v1.1.1.1", function() {
    spyOn(child, "spawnSync").and.returnValue({
      status: 0,
      stdout: "v1.1.1.1"
    });
    expect(getPreviousVersions()).toEqual([]);
  });

  it("should not match v1.1.1-rc", function() {
    spyOn(child, "spawnSync").and.returnValue({
      status: 0,
      stdout: "v1.1.1-rc"
    });
    expect(getPreviousVersions()).toEqual([]);
  });

  it("should match multiple semvers", function() {
    spyOn(child, "spawnSync").and.returnValue({
      status: 0,
      stdout: "v0.1.1\nv0.1.2"
    });
    expect(getPreviousVersions()).toEqual([semver("v0.1.1"), semver("v0.1.2")]);
  });

  it("should sort multiple semvers", function() {
    spyOn(child, "spawnSync").and.returnValue({
      status: 0,
      stdout: "v0.1.1\nv0.1.1-rc1"
    });
    expect(getPreviousVersions()).toEqual([
      semver("v0.1.1-rc1"),
      semver("v0.1.1")
    ]);
  });

  it("should decorate all versions", function() {
    mocks.decorateVersion.calls.reset();

    spyOn(child, "spawnSync").and.returnValue({
      status: 0,
      stdout: "v0.1.1\nv0.1.2"
    });
    var versions = getPreviousVersions();

    expect(mocks.decorateVersion.calls.allArgs()).toEqual([
      [semver("v0.1.1")],
      [semver("v0.1.2")]
    ]);
  });
});

var mocks = require("../mocks/mocks");
var mockPackageFactory = require("../mocks/mockPackage");
var Dgeni = require("dgeni");
var gitDataFactory = require("./gitData");

describe("gitData", function() {
  var gitData;

  beforeEach(function() {
    mockPackage = mockPackageFactory().factory(gitDataFactory);

    var dgeni = new Dgeni([mockPackage]);

    var injector = dgeni.configureInjector();
    gitData = injector.get("gitData");
  });

  describe("version", function() {
    it("should be set to currentVersion of versionInfo", function() {
      expect(gitData.version).toEqual(mocks.versionInfo.currentVersion);
    });
  });

  describe("versions", function() {
    it("should be set to previousVersions of versionInfo", function() {
      expect(gitData.versions).toEqual(mocks.versionInfo.previousVersions);
    });
  });

  describe("info", function() {
    it("should be set to gitRepoInfo of versionInfo", function() {
      expect(gitData.info).toEqual(mocks.versionInfo.gitRepoInfo);
    });
  });
});

var mockPackageFactory = require("../mocks/mockPackage");
var Dgeni = require("dgeni");
var gitRepoInfoFactory = require("./gitRepoInfo");

describe("gitRepoInfo", function() {
  var gitRepoInfo, mockPackage;

  beforeEach(function() {
    mockPackage = mockPackageFactory().factory(gitRepoInfoFactory);

    var dgeni = new Dgeni([mockPackage]);

    var injector = dgeni.configureInjector();
    gitRepoInfo = injector.get("gitRepoInfo");
  });

  it("should be set", function() {
    expect(gitRepoInfo).not.toBe(null);
  });

  it("should have owner set from package repository url", function() {
    expect(gitRepoInfo.owner).toBe("owner");
  });

  it("should have repo set from package repository url", function() {
    expect(gitRepoInfo.repo).toBe("repo");
  });

  it("should throw an error if packageInfo is empty", function() {
    mockPackage.factory(function packageInfo() {
      return {};
    });
    var dgeni = new Dgeni([mockPackage]);
    var injector = dgeni.configureInjector();

    expect(function() {
      injector.get("gitRepoInfo");
    }).toThrow();
  });
});

var rewire = require("rewire");
var packageInfoFactory = rewire("./packageInfo.js");

describe("packageInfo", function() {
  var fs, path;

  beforeEach(function() {
    fs = packageInfoFactory.__get__("fs");
    path = packageInfoFactory.__get__("path");
    spyOn(path, "resolve").and.returnValue("");
    spyOn(fs, "existsSync").and.returnValue(true);
  });

  it("should read package.json as UTF-8", function() {
    spyOn(fs, "readFileSync").and.returnValue("{}");

    packageInfoFactory();

    expect(fs.readFileSync).toHaveBeenCalledWith("package.json", "UTF-8");
  });
  it("should return parsed file contents", function() {
    fs.existsSync.and.returnValue(true);
    spyOn(fs, "readFileSync").and.returnValue('{"foo":"bar"}');

    var packageInfo = packageInfoFactory();

    expect(packageInfo).toEqual({ foo: "bar" });
  });

  it("should walk up the tree looking for jasmine", function() {
    fs.existsSync.and.callFake(function(file) {
      if (file == "package.json") {
        return false;
      } else {
        return true;
      }
    });

    spyOn(fs, "readFileSync").and.returnValue("{}");
    spyOn(path, "dirname").and.returnValue("../");

    packageInfoFactory();

    expect(fs.readFileSync).toHaveBeenCalledWith("../package.json", "UTF-8");
  });
});

var rewire = require("rewire");
var semver = require("semver");
var Dgeni = require("dgeni");

var mocks = require("../mocks/mocks.js");
var mockPackageFactory = require("../mocks/mockPackage");

var versionInfoFactory = rewire("./versionInfo.js");

describe("versionInfo", function() {
  var versionInfo, mockPackage, gitMocks, ciBuild;

  beforeEach(function() {
    mocks.getPreviousVersions.calls.reset();

    var child = versionInfoFactory.__get__("child");

    gitMocks = {
      rev: mocks.mockGitRevParse,
      describe: mocks.mockDefaultFail,
      cat: mocks.mockDefaultFail
    };

    spyOn(child, "spawnSync").and.callFake(function(command, args) {
      if (args[0] === "rev-parse") {
        return gitMocks.rev;
      } else if (args[0] === "describe") {
        return gitMocks.describe;
      } else if (args[0] === "cat-file") {
        return gitMocks.cat;
      } else {
        return mocks.mockDefaultFail;
      }
    });

    mockPackage = mockPackageFactory().factory(versionInfoFactory);

    var dgeni = new Dgeni([mockPackage]);

    var injector = dgeni.configureInjector();
    versionInfo = injector.get("versionInfo");

    ciBuild = process.env.TRAVIS_BUILD_NUMBER;
  });

  afterEach(function() {
    process.env.TRAVIS_BUILD_NUMBER = ciBuild;
  });

  describe("currentPackage", function() {
    it("should be set", function() {
      expect(versionInfo.currentPackage).not.toBe(null);
    });

    it("should be set to passed in package", function() {
      expect(versionInfo.currentPackage).toBe(mocks.packageWithVersion);
    });
  });

  it("should set gitRepoInfo", function() {
    expect(versionInfo.gitRepoInfo).toBe(mocks.gitRepoInfo);
  });

  describe("previousVersions", function() {
    it("should call getPreviousVersions", function() {
      expect(mocks.getPreviousVersions.calls.all().length).toEqual(1);
      expect(mocks.getPreviousVersions).toHaveBeenCalled();
    });

    it("should equal getPreviousVersions", function() {
      expect(mocks.getPreviousVersions.calls.all().length).toEqual(1);
      expect(versionInfo.previousVersions).toEqual(mocks.getPreviousVersions());
    });
  });

  describe("currentVersion with no tag", function() {
    it("should have isSnapshot set to true", function() {
      expect(versionInfo.currentVersion.isSnapshot).toBe(true);
    });

    it("should have codeName of snapshot", function() {
      expect(versionInfo.currentVersion.codeName).toBe("snapshot");
    });

    it("should have the commitSHA set", function() {
      expect(versionInfo.currentVersion.commitSHA).toBe(
        mocks.mockGitRevParse.stdout
      );
    });

    describe("with branchVersion/Pattern", function() {
      beforeEach(function() {
        versionInfo = versionInfoFactory(function() {},
        mocks.packageWithBranchVersion);
      });

      it("should satisfy the branchVersion", function() {
        expect(
          semver.satisfies(
            versionInfo.currentVersion,
            mocks.packageWithBranchVersion.branchVersion
          )
        ).toBeTruthy();
      });

      it("should have a prerelease", function() {
        expect(versionInfo.currentVersion.prerelease).toBeTruthy();
      });
    });

    describe("with no BUILD_NUMBER", function() {
      it("should have a local prerelease", function() {
        delete process.env.TRAVIS_BUILD_NUMBER;

        versionInfo = versionInfoFactory(function() {},
        mocks.packageWithVersion);

        expect(versionInfo.currentVersion.prerelease[0]).toBe("local");
      });
    });

    describe("with a BUILD_NUMBER", function() {
      it("should have a build prerelease", function() {
        process.env.TRAVIS_BUILD_NUMBER = "10";

        versionInfo = versionInfoFactory(function() {},
        mocks.packageWithVersion);

        expect(versionInfo.currentVersion.prerelease[0]).toBe("build");
        expect(versionInfo.currentVersion.prerelease[1]).toBe("10");
      });
    });
  });

  describe("currentVersion with annotated tag", function() {
    beforeEach(function() {
      gitMocks.cat = mocks.mockGitCatFile;
      gitMocks.describe = mocks.mockGitDescribe;

      versionInfo = versionInfoFactory(function() {}, mocks.packageWithVersion);
    });

    it("should have a version matching the tag", function() {
      var tag = gitMocks.describe.stdout.trim();
      var version = semver.parse(tag);
      expect(versionInfo.currentVersion.version).toBe(version.version);
    });

    it("should pull the codeName from the tag", function() {
      expect(versionInfo.currentVersion.codeName).toBe("mockCodeName");
    });

    it("should set codeName to null if it doesn't have a codename specified", function() {
      gitMocks.cat = mocks.mockGitCatFileNoCodeName;

      var dgeni = new Dgeni([mockPackage]);
      var injector = dgeni.configureInjector();
      versionInfo = injector.get("versionInfo");
      expect(versionInfo.currentVersion.codeName).toBe(null);
    });

    it("should set codeName to falsy if it has a badly formatted codename", function() {
      gitMocks.cat = mocks.mockGitCatFileBadFormat;

      var dgeni = new Dgeni([mockPackage]);
      var injector = dgeni.configureInjector();
      versionInfo = injector.get("versionInfo");
      expect(versionInfo.currentVersion.codeName).toBeFalsy();
    });

    it("should have the commitSHA set", function() {
      expect(versionInfo.currentVersion.commitSHA).toBe(
        mocks.mockGitRevParse.stdout
      );
    });
  });
});
