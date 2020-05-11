'use strict';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
const merge = require('merge-options');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const wp = require('@ngtools/webpack');

module.exports = function withDefaults(extConfig) {
  const defaultConfig = {
    mode: 'none',
    target: 'node',
    node: { __dirname: false },
    resolve: {
      mainFields: ['module', 'main'],
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'ts-loader',
              options: { compilerOptions: { sourceMap: true } },
            },
          ],
        },
      ],
    },
    externals: { vscode: 'commonjs vscode' }, //'react'
    output: {
      filename: '[name].js',
      path: path.join(extConfig.context, 'out'),
      libraryTarget: 'commonjs',
    },
    devtool: 'source-map', //'inline-source-map'
  };

  return merge(defaultConfig, extConfig);
};
