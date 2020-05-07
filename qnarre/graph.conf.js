'use strict';

module.exports = function(karma) {
  karma.set({
    basePath: '',
    frameworks: ['jasmine'],
    preprocessors: {
      './out-tsc/spec/graph/*.spec.js': ['webpack']
    },
    files: ['./out-tsc/spec/graph/*.spec.js'],
    webpack: {},
    webpackMiddleware: {
      stats: 'errors-only'
    },
    exclude: ['./out-tsc/spec/app/graph/render.spec.js'],
    client: {
      clearContext: false
    },
    reporters: ['kjhtml', 'progress'],
    port: 9876,
    colors: true,
    logLevel: karma.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true,
    concurrency: Infinity
  });
};
