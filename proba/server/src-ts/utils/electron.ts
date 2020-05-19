import * as temp from './temp';
import path = require('path');
import fs = require('fs');
import cp = require('child_process');
import process = require('process');

const getRootTempDir = (() => {
  let dir: string | undefined;
  return () => {
    if (!dir) {
      dir = temp.getTempFile(
        `vscode-typescript${
          process.platform !== 'win32' && process.getuid ? process.getuid() : ''
        }`
      );
    }
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    return dir;
  };
})();

export const getInstanceDir = (() => {
  let dir: string | undefined;
  return () => {
    if (!dir) {
      dir = path.join(getRootTempDir(), temp.makeRandomHexString(20));
    }
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    return dir;
  };
})();

export function getTempFile(prefix: string): string {
  return path.join(getInstanceDir(), `${prefix}-${temp.makeRandomHexString(20)}.tmp`);
}

function generatePatchedEnv(env: any, modulePath: string): any {
  const e = Object.assign({}, env);
  e['ELECTRON_RUN_AS_NODE'] = '1';
  e['NODE_PATH'] = path.join(modulePath, '..', '..', '..');
  e['PATH'] = e['PATH'] || process.env.PATH;
  return e;
}

export interface ForkOptions {
  readonly cwd?: string;
  readonly execArgv?: string[];
}

export function fork(
  modulePath: string,
  args: string[],
  options: ForkOptions
): cp.ChildProcess {
  const e = generatePatchedEnv(process.env, modulePath);
  return cp.fork(modulePath, args, {
    silent: true,
    cwd: options.cwd,
    env: e,
    execArgv: options.execArgv,
  });
}
