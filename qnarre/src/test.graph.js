#!/usr/bin/env node
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Jasmine = require('jasmine');
const jasmine = new Jasmine();
jasmine.loadConfig({
  spec_dir: './out-tsc/spec/graph',
  spec_files: ['**/*[sS]pec.js'],
  helpers: ['helpers/**/*.js'],
  random: false,
  seed: null,
  stopSpecOnExpectationFailure: false
});
jasmine.execute();
