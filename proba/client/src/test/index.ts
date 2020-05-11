import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd' });
  mocha.useColors(true);
  mocha.timeout(100000);

  const root = __dirname;

  return new Promise((res, rej) => {
    glob('**.test.js', { cwd: root }, (err, fs) => {
      if (err) return rej(err);
      fs.forEach((f) => mocha.addFile(path.resolve(root, f)));
      try {
        mocha.run((es) => {
          if (es > 0) rej(new Error(`${es} tests failed.`));
          else res();
        });
      } catch (e) {
        console.error(e);
        rej(e);
      }
    });
  });
}
