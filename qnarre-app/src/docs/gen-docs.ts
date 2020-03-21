#!/usr/bin/env node
import path from 'path';
import {Dgeni, Package} from '.';

const parseArgs = require('minimist')
  .usage(
    'Usage: $0 path/to/mainPackage [path/to/other/packages ...] [--log level]'
  )
  .demand(1).argv;

const paths: string[] = parseArgs._;

const packs = paths.map(p => {
  if (p.indexOf('.') === 0) {
    p = path.resolve(p);
  }
  return require(p);
});

const level = parseArgs.log || parseArgs.l;
if (level) {
  packs.push(
    new Package('cli-package').addConfig(log => {
      log.level = level;
    })
  );
}

new Dgeni(packs).generate().then(() => {
  console.log('Finished generating docs');
});
