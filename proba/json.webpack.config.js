'use strict';

const withDefaults = require('../../shared.webpack.config');
const path = require('path');
const webpack = require('webpack');

const config = withDefaults({
  context: path.join(__dirname),
  entry: {
    extension: './src/jsonServerMain.ts',
  },
  output: {
    filename: 'jsonServerMain.js',
    path: path.join(__dirname, 'dist'),
  },
});

// add plugin, don't replace inherited
config.plugins.push(new webpack.IgnorePlugin(/vertx/)); // request-light dependency

module.exports = config;

const withDefaults = require('../shared.webpack.config');
const path = require('path');
const webpack = require('webpack');

const config = withDefaults({
  context: path.join(__dirname, 'client'),
  entry: {
    extension: './src/jsonMain.ts',
  },
  output: {
    filename: 'jsonMain.js',
    path: path.join(__dirname, 'client', 'dist'),
  },
});

// add plugin, don't replace inherited
config.plugins.push(new webpack.IgnorePlugin(/vertx/)); // request-light dependency

module.exports = config;
