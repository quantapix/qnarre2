'use strict';

const withDefaults = require('../shared.webpack.config');

module.exports = withDefaults({
  context: __dirname,
  resolve: {
    mainFields: ['module', 'main'],
  },
  entry: {
    extension: './src/extension.ts',
  },
});

const path = require('path');

module.exports = {
  entry: {
    index: './preview-src/index.ts',
    pre: './preview-src/pre.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  devtool: 'inline-source-map',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'media'),
  },
};
