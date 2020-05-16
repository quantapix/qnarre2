'use strict';

const withDefaults = require('../../shared.webpack.config');
const path = require('path');

module.exports = withDefaults({
  context: path.join(__dirname),
  entry: {
    extension: './src/htmlServerMain.ts',
  },
  output: {
    filename: 'htmlServerMain.js',
    path: path.join(__dirname, 'dist'),
  },
  externals: {
    typescript: 'commonjs typescript',
  },
});

('use strict');

const withDefaults = require('../shared.webpack.config');
const path = require('path');

module.exports = withDefaults({
  context: path.join(__dirname, 'client'),
  entry: {
    extension: './src/htmlMain.ts',
  },
  output: {
    filename: 'htmlMain.js',
    path: path.join(__dirname, 'client', 'dist'),
  },
});
