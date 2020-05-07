import semver from 'semver';
import {Package} from '..';
import mocks from '../mocks.js.js';

const packageWithVersion = {
  name: 'dgeni-packages',
  version: '0.10.13',
  repository: {
    type: 'git',
    url: 'https://github.com/owner/repo.git'
  }
};

const packageWithBranchVersion = {
  name: 'dgeni-packages',
  branchVersion: '^1.4.0-beta.0',
  branchPattern: '1.4.*',
  repository: {
    type: 'git',
    url: 'https://github.com/owner/repo.git'
  }
};

const mockVersionInfo = {
  currentVersion: 'currentVersion',
  previousVersions: 'previousVersions',
  gitRepoInfo: 'gitRepoInfo'
};

const mockGitLsRemoteTags = {
  code: 0,
  stdout:
    '85ae09c2119bf9b20cd45fc4e9dab77c5940d627	refs/tags/v0.10.11-rc2\n' +
    '373c3bf61785139a65e76c023e798b49b7437c37	refs/tags/v0.10.13\n' +
    '573c3bf61795139a65e76c023e798b49b7437c37	refs/tags/v1.3.invalid'
};

const mockGitRevParse = {
  code: 0,
  stdout: 'revision'
};

const mockGitCatFile = {
  code: 0,
  stdout: 'codename(mockCodeName)'
};

const mockGitCatFileNoCodeName = {
  code: 0,
  stdout: 'no code name'
};

const mockGitCatFileBadFormat = {
  code: 0,
  stdout: 'bad format codename()'
};

const mockGitDescribe = {
  code: 0,
  stdout: 'v0.10.15'
};

const mockDefaultFail = {
  code: 1,
  stdout: 'default'
};

const mockGitRepoInfo = {
  owner: 'owner',
  repo: 'repo'
};

export const aaa = {
  decorateVersion: jasmine.createSpy('decorateVersion'),
  getPreviousVersions: jasmine
    .createSpy('getPreviousVersions')
    .and.returnValue([semver('0.10.11-rc2'), semver('0.10.13')]),
  gitData: {},
  gitRepoInfo: mockGitRepoInfo,
  packageWithBranchVersion,
  packageWithVersion,
  versionInfo: mockVersionInfo,
  mockGitCatFile,
  mockGitCatFileBadFormat,
  mockGitCatFileNoCodeName,
  mockGitDescribe,
  mockGitLsRemoteTags,
  mockGitRevParse,
  mockDefaultFail
};

export function mockPackage() {
  return new Package('mockPackage', [require('../'), require('../../base')])
    .addFactory('decorateVersion', () => {
      return mocks.decorateVersion;
    })
    .addFactory('getPreviousVersions', () => {
      return mocks.getPreviousVersions;
    })
    .addFactory('gitData', () => {
      return mocks.gitData;
    })
    .addFactory('gitRepoInfo', () => {
      return mocks.gitRepoInfo;
    })
    .addFactory('packageInfo', () => {
      return mocks.packageWithVersion;
    })
    .addFactory('versionInfo', () => {
      return mocks.versionInfo;
    })
    .addFactory('log', () => {
      return require('dgeni/lib/mocks/log')(false);
    })
    .addFactory('templateEngine', function dummyTemplateEngine() {
      /* */
    });
}
