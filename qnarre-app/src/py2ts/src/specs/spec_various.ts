class A {
  constructor(value) {
    var d;
    this.value = value;
    d = {a: 1, b: 2};
    super(x, y);
  }
  meth() {
    super.another_meth(x, y);
  }
}
var a, b;
a = 'foo';
b = 1;
class A {
  async method() {}
}
class B extends A {
  async method() {
    await A.prototype.method.call(this);
  }
}
var _pj;
function _pj_snippets(container) {
  function set_decorators(cls, props) {
    var deco, decos;
    var _pj_a = props;
    for (var p in _pj_a) {
      if (_pj_a.hasOwnProperty(p)) {
        decos = props[p];
        function reducer(val, deco) {
          return deco(val, cls, p);
        }
        deco = decos.reduce(reducer, cls.prototype[p]);
        if (
          !(deco instanceof Function || deco instanceof Map || deco instanceof WeakMap) &&
          deco instanceof Object &&
          ('value' in deco || 'get' in deco)
        ) {
          delete cls.prototype[p];
          Object.defineProperty(cls.prototype, p, deco);
        } else {
          cls.prototype[p] = deco;
        }
      }
    }
  }
  container['set_decorators'] = set_decorators;
  return container;
}
_pj = {};
_pj_snippets(_pj);
class Foo3 {
  foo() {
    return 'bar';
  }
}
_pj.set_decorators(Foo3, {foo: [a_deco]});
class Foo3 {
  static foo() {
    return 'bar';
  }
}
var a;
a = 1;
if (a === 0) {
  window.alert("Can't be");
} else {
  if (a < 0) {
    window.alert("Something's wrong");
  } else {
    window.alert("That's it");
  }
}
function MyError(message) {
  this.name = 'MyError';
  this.message = message || 'Custom error MyError';
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error(message).stack;
  }
}
MyError.prototype = Object.create(Error.prototype);
MyError.prototype.constructor = MyError;
class MySecondError extends MyError {
  /* A stupid error */
}
var bar, foo, zoo;
foo = 5;
bar = 'boo';
zoo = 10;
export {foo, bar, zoo};
export default zoo;
var a, b, c;
a = 'foo';
b = {a: a};
c = `value of a=${b['a']}`;
class Bar {
  repr() {
    return `This is a ${this.what}`;
  }
}
var el;
function simple_alert() {
  window.alert('Hi there!');
}
el = document.querySelector('button');
el.addEventListener('click', simple_alert);
import * as foo from 'foo';
import * as bar from 'bar';
import * as b from 'foo/bar';
import {bye as bb, hello as h} from 'foo/bar';
import {bar} from '../foo/zoo';
import * as foo from './foo';
import {bar} from './foo';
import {zoo} from 'foo-bar';
import * as fb from 'foo-bar';
import {zoo} from '@foo/bar';
import * as fb from '@foo/bar';
import bar from 'foo';
import {zoo} from '@~/foo/bar';
var test_foo;
test_name = 2;
test_foo = true;
export {test_name, test_foo};
class Foo4 {
  constructor() {
    var bar;
    bar = () => {
      return 10;
    };
    this.bar = bar;
  }
}
class Example {
  foo() {
    var bar;
    bar = () => {};
  }
}
class Example {
  foo() {
    var bar;
    bar = () => {
      var zoo;
      zoo = () => {};
    };
  }
}
function test_isi() {
  var a;
  a = foo instanceof Bar || foo instanceof Zoo;
}
typeof foo === 'string' || foo instanceof String;
typeof bar === 'number' || bar instanceof Number;
typeof zoo === 'number' || zoo instanceof Number;
function with_kw(a, kw = {}) {}
with_kw(1, {foo: 2, bar: 3});
function test_new() {
  var a;
  a = new foo();
}
class Foo {
  get bar() {
    return this._bar;
  }
  set bar(value) {
    this._bar = value;
  }
}
function test_self_removed() {
  function func(a, b) {}
}
function func() {
  var foo;
  foo = 'foofoo';
  foo.slice(1);
  foo.slice(0, -1);
  foo.slice(3, -1);
  foo[2];
}
class Foo2 {
  get length() {
    return 5;
  }
  toString() {
    return 'bar';
  }
}
x.toString();
class Bar extends foo(1, 2) {}
class Bar2 extends Foo.Zoo {}
var value;
value = 0;
function MyError(message) {
  this.name = 'MyError';
  this.message = message || 'Custom error MyError';
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error(message).stack;
  }
}
MyError.prototype = Object.create(Error.prototype);
MyError.prototype.constructor = MyError;
class MySecondError extends MyError {
  /* A stupid error */
}
function MyThirdError(message) {
  this.name = 'MyThirdError';
  this.message = message || 'Custom error MyThirdError';
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error(message).stack;
  }
}
MyThirdError.prototype = Object.create(Error.prototype);
MyThirdError.prototype.constructor = MyThirdError;
function MyFourthError(message) {
  this.name = 'MyFourthError';
  this.message = message || 'Custom error MyFourthError';
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error(message).stack;
  }
}
MyFourthError.prototype = Object.create(Error.prototype);
MyFourthError.prototype.constructor = MyFourthError;
try {
  value += 1;
  throw new MyError('Something bad happened');
  value += 1;
} catch (e) {
  if (e instanceof MySecondError) {
    var err = e;
    value += 20;
  } else {
    if (e instanceof MyThirdError || e instanceof MyFourthError) {
      var err2 = e;
      value += 30;
    } else {
      if (e instanceof MyError) {
        value += 40;
      } else {
        value += 50;
      }
    }
  }
} finally {
  value += 1;
}
var value;
function MyError(message) {
  this.name = 'MyError';
  this.message = message || 'Custom error MyError';
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error(message).stack;
  }
}
MyError.prototype = Object.create(Error.prototype);
MyError.prototype.constructor = MyError;
class MySecondError extends MyError {
  /* A stupid error */
}
try {
  value = 0;
  throw new MySecondError('This is an error');
} catch (e) {
  if (e instanceof MySecondError) {
    value = 1;
  } else {
    throw e;
  }
}
