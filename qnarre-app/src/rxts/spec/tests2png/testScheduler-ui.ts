import * as _ from 'lodash';
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as marble from './marbles';
import {TestScheduler} from 'rxjs/testing';

//tslint:disable:no-var-requires no-require-imports
const commonInterface = require('mocha/lib/interfaces/common');
const escapeRe = require('escape-string-regexp');

(function (this: any, window: any) {
  window = window || this;
  let lastTime = 0;
  const vendors = ['ms', 'moz', 'webkit', 'o'];
  for (let x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
    window.cancelAnimationFrame =
      window[vendors[x] + 'CancelAnimationFrame'] ||
      window[vendors[x] + 'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback: Function, element: any) => {
      const currTime = new Date().getTime();
      const timeToCall = Math.max(0, 16 - (currTime - lastTime));
      const id = window.setTimeout(() => {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number) => {
      clearTimeout(id);
    };
  }
})(global);

chai.use(sinonChai);

declare const module: any, global: any, Suite: any, Test: any;

if (global && !(typeof window !== 'undefined')) {
  global.mocha = require('mocha');
  global.Suite = global.mocha.Suite;
  global.Test = global.mocha.Test;
}

const diagramFunction = global.asDiagram;

module.exports = function (suite: any) {
  const suites = [suite];

  suite.on('pre-require', function (context: any, file: any, mocha: any) {
    const common = (<any>commonInterface)(suites, context);

    context.before = common.before;
    context.after = common.after;
    context.beforeEach = common.beforeEach;
    context.afterEach = common.afterEach;
    context.run = mocha.options.delay && common.runWithSuite(suite);
    context.rxTestScheduler = null;
    context.hot = marble.hot;
    context.cold = marble.cold;
    context.expectSource = marble.expectSource;
    context.expectSubscriptions = marble.expectSubscriptions;
    context.time = marble.time;
    context.describe = context.context = function (title: any, fn: any) {
      const suite = (<any>Suite).create(suites[0], title);
      suite.file = file;
      suites.unshift(suite);
      fn.call(suite);
      suites.shift();
      return suite;
    };
    context.xdescribe = context.xcontext = context.describe.skip = function (
      title: any,
      fn: any
    ) {
      const suite = (<any>Suite).create(suites[0], title);
      suite.pending = true;
      suites.unshift(suite);
      fn.call(suite);
      suites.shift();
    };
    context.describe.only = function (title: any, fn: any) {
      const suite = context.describe(title, fn);
      mocha.grep(suite.fullTitle());
      return suite;
    };
    context.type = function (title: any, fn: any) {};

    function stringify(x: any): string {
      return JSON.stringify(x, function (key: string, value: any) {
        if (Array.isArray(value)) {
          return (
            '[' +
            value.map(function (i) {
              return '\n\t' + stringify(i);
            }) +
            '\n]'
          );
        }
        return value;
      })
        .replace(/\\"/g, '"')
        .replace(/\\t/g, '\t')
        .replace(/\\n/g, '\n');
    }

    function deleteErrorNoteStack(marble: any) {
      const {notification} = marble;
      if (notification) {
        const {kind, error} = notification;
        if (kind === 'E' && error instanceof Error) {
          notification.error = {name: error.name, message: error.message};
        }
      }
      return marble;
    }

    function sourceMatcher(actual: any, expected: any) {
      if (Array.isArray(actual) && Array.isArray(expected)) {
        actual = actual.map(deleteErrorNoteStack);
        expected = expected.map(deleteErrorNoteStack);
        const passed = _.isEqual(actual, expected);
        if (passed) {
          return;
        }

        let message = '\nExpected \n';
        actual.forEach((x: any) => (message += `\t${stringify(x)}\n`));

        message += '\t\nto deep equal \n';
        expected.forEach((x: any) => (message += `\t${stringify(x)}\n`));

        chai.assert(passed, message);
      } else {
        chai.assert.deepEqual(actual, expected);
      }
    }

    const it = (context.it = context.specify = function (title: any, fn: any) {
      context.rxTestScheduler = null;
      let modified = fn;

      if (fn && fn.length === 0) {
        modified = function () {
          context.rxTestScheduler = new TestScheduler(sourceMatcher);

          try {
            fn();
            context.rxTestScheduler.flush();
          } finally {
            context.rxTestScheduler = null;
          }
        };
      }

      const suite = suites[0];
      if (suite.pending) {
        modified = null;
      }
      const test = new (<any>Test)(title, modified);
      test.file = file;
      suite.addTest(test);
      return test;
    });

    context.asDiagram = function (label: any) {
      if (diagramFunction) {
        return diagramFunction(label, it);
      }
      return it;
    };

    context.it.only = function (title: any, fn: any) {
      const test = it(title, fn);
      const reString = '^' + (<any>escapeRe)(test.fullTitle()) + '$';
      mocha.grep(new RegExp(reString));
      return test;
    };

    context.xit = context.xspecify = context.it.skip = function (title: string) {
      context.it(title);
    };

    context.it.retries = function (n: number) {
      context.retries(n);
    };
  });
};

Object.defineProperty(Error.prototype, 'toJSON', {
  value: function (this: any) {
    const alt: Record<string, any> = {};

    Object.getOwnPropertyNames(this).forEach(function (this: any, key: string) {
      if (key !== 'stack') {
        alt[key] = this[key];
      }
    }, this);
    return alt;
  },
  configurable: true
});
