const withDefaults = require('../shared.webpack.config');

module.exports = withDefaults({
  context: __dirname,
  resolve: {
    mainFields: ['module', 'main'],
  },
  externals: {
    'typescript-vscode-sh-plugin': 'commonjs vscode',
  },
  entry: {
    extension: './src/extension.ts',
  },
});
