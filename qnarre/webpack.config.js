/*
exports = {
  module: {
    rules: [
      {
        test: /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/,
        loader: '@ngtools/webpack'
      }
    ]
  },
  plugins: [
    new wp.AngularCompilerPlugin({
      tsConfigPath: 'tsconfig.app.json',
      entryModule: 'app/app.module.ts#AppModule',
      sourceMap: true,
      mode: 'none'
    })
  ]
};
*/
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const wp = require('@ngtools/webpack');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: 'out-tsc/app-routing/main.js',
  output: {
    filename: 'bundle.js'
  },
  resolve: {
    // extensions: ['.ts', '.tsx', '.js']
    extensions: ['.js']
  },
  externals: ['react', /^@angular/]
  /*
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: [path.resolve(__dirname, 'app')],
        exclude: [path.resolve(__dirname, 'app/demo-files')],
        loader: '@ngtools/webpack' //'ts-loader'
      }
    ]
  },
  plugins: [
    new wp.AngularCompilerPlugin({
      tsConfigPath: 'tsconfig.app.json',
      entryModule: 'app/app.module.ts#AppModule',
      sourceMap: true
    })
  ]
  */
};
