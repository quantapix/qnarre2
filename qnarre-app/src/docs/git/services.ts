import child from "child_process";
import fs from "fs";
import _ from "lodash";
import path from "path";
import semver from "semver";

export function decorateVersion() {
  return (v: {
    major: number;
    minor: number;
    prerelease: any[];
    version: string;
    patch: number;
    raw: string;
    docsUrl: string;
    isOldDocsUrl: boolean;
  }) => {
    if (
      (v.major === 1 && v.minor === 0 && v.prerelease.length > 0) ||
      (v.major === 1 && v.minor === 2 && v.prerelease[0] === "rc1")
    ) {
      v.version = [v.major, v.minor, v.patch].join(".") + v.prerelease.join("");
      v.raw = "v" + v.version;
    }
    v.docsUrl = "http://code.angularjs.org/" + v.version + "/docs";
    if (v.major < 1 || (v.major === 1 && v.minor === 0 && v.patch < 2)) {
      v.docsUrl += "-" + v.version;
      v.isOldDocsUrl = true;
    }
  };
}

export function getPreviousVersions(
  decorateVersion: (arg0: semver.SemVer | null) => void,
  packageInfo: { repository: { url: any } }
) {
  return () => {
    const url = packageInfo.repository.url;
    const res = child.spawnSync("git", ["ls-remote", "--tags", url], {
      encoding: "utf8"
    });
    if (res.status === 0) {
      return _(res.stdout.match(/v[0-9].*[0-9]$/gm))
        .map(tag => {
          return semver.parse(tag);
        })
        .filter()
        .map(v => {
          decorateVersion(v);
          return v;
        })
        .sort(semver.compare)
        .value();
    } else {
      return [];
    }
  };
}

export function gitData(info: {
  currentVersion: any;
  previousVersions: any;
  gitRepoInfo: any;
}) {
  return {
    version: info.currentVersion,
    versions: info.previousVersions,
    info: info.gitRepoInfo
  };
}

export function gitRepoInfo(packageInfo: { repository: { url: string } }) {
  const GITURL_REGEX = /^(?:git\+https|https?):\/\/[^/]+\/([^/]+)\/(.+).git$/;
  const match = GITURL_REGEX.exec(packageInfo.repository.url);
  return {
    owner: match![1],
    repo: match![2]
  };
}

export function packageInfo() {
  let packageFolder = path.resolve(".");
  while (!fs.existsSync(path.join(packageFolder, "package.json"))) {
    const parent = path.dirname(packageFolder);
    if (parent === packageFolder) {
      break;
    }
    packageFolder = parent;
  }
  return JSON.parse(
    fs.readFileSync(path.join(packageFolder, "package.json"), "UTF-8")
  );
}

let current,
  curPack: {
    branchVersion: string | semver.Range | undefined;
    version: string | undefined;
    branchPattern: string | undefined;
  },
  prevs: any;

function satisfiesVersion(v: string | semver.SemVer) {
  if (curPack.branchVersion !== undefined) {
    return semver.satisfies(v, curPack.branchVersion);
  } else if (curPack.version !== undefined) {
    return semver.satisfies(v, "^" + curPack.version);
  } else {
    return true;
  }
}

function getCodeName(tagName: string) {
  const o = child.spawnSync("git", ["cat-file", "-p " + tagName], {
    encoding: "utf8"
  }).stdout;
  const m = o.match(/^.*codename.*$/gm);
  const msg = m && m[0];
  return msg && msg.match(/codename\((.*)\)/)![1];
}

function getCommitSHA() {
  return child
    .spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" })
    .stdout.replace("\n", "");
}

function getBuild() {
  const hash = child
    .spawnSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" })
    .stdout.replace("\n", "");
  return "sha." + hash;
}

function getTaggedVersion() {
  const res = child.spawnSync("git", ["describe", "--exact-match"], {
    encoding: "utf8"
  });
  if (res.code === 0) {
    const tag = res.stdout.trim();
    const v = semver.parse(tag);
    if (v && satisfiesVersion(v)) {
      v.codeName = getCodeName(tag);
      v.full = v.version;
      if (curPack.branchPattern !== undefined) {
        v.branch = "v" + curPack.branchPattern.replace("*", "x");
      }
      return v;
    }
  }
  return undefined;
}

function getSnapshotVersion() {
  let version = _(prevs)
    .filter(tag => {
      return satisfiesVersion(tag);
    })
    .last();
  if (!version) {
    if (curPack.version !== undefined) {
      version = new semver.SemVer(curPack.version);
    } else if (curPack.branchPattern !== undefined) {
      version = new semver.SemVer(
        curPack.branchPattern.replace("*", "0-beta.1")
      );
    } else {
      version = new semver.SemVer("0.1.0-beta.1");
    }
  }
  version = new semver.SemVer(version.raw);
  const jenkinsBuild =
    process.env.TRAVIS_BUILD_NUMBER || process.env.BUILD_NUMBER;
  if (!version.prerelease || !version.prerelease.length) {
    version.patch++;
  }
  version.prerelease = jenkinsBuild ? ["build", jenkinsBuild] : ["local"];
  version.build = getBuild();
  version.codeName = "snapshot";
  version.isSnapshot = true;
  version.format();
  version.full = version.version + "+" + version.build;
  version.branch = "master";
  return version;
}

export function versionInfo(
  getPreviousVersions: () => any,
  packageInfo: any,
  gitRepoInfo: any
) {
  curPack = packageInfo;
  prevs = getPreviousVersions();
  current = getTaggedVersion() || getSnapshotVersion();
  current.commitSHA = getCommitSHA();
  return {
    currentPackage: curPack,
    gitRepoInfo,
    previousVersions: prevs,
    currentVersion: current
  };
}
