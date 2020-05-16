'use strict';

const withDefaults = require('../../shared.webpack.config');
const path = require('path');

module.exports = withDefaults({
  context: path.join(__dirname),
  entry: {
    extension: './src/cssServerMain.ts',
  },
  output: {
    filename: 'cssServerMain.js',
    path: path.join(__dirname, 'dist'),
  },
});

('use strict');

const withDefaults = require('../shared.webpack.config');
const path = require('path');

module.exports = withDefaults({
  context: path.join(__dirname, 'client'),
  entry: {
    extension: './src/cssMain.ts',
  },
  output: {
    filename: 'cssMain.js',
    path: path.join(__dirname, 'client', 'dist'),
  },
});
