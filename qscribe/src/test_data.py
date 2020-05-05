
tests1 = [
    {
        "py": """
def func():

    __all__ = ["foo", "bar"]

    __all__ = ("foo", "bar")
  """,
        "ts": """
  """,
    },
    {
        "py": """
def func():
    def afunc(a, b, *args, foo=None, **kw):
        acall(a, b, *args, foo=None, **kw)

        def bfunc(a, b, *, foo=None, **kw):
            pass

        def cfunc(a=1, b=2, *, foo=None):
            pass
  """,
        "ts": """
  """,
    },
    {
        "py": """
def func():
    class TestError(Exception):
        pass

    class TestError2(Exception):
        "Test doc"
  """,
        "ts": """
  """,
    },
    {
        "py": """
def func():
    a = "foo"
    return f"value of a={a}"
  """,
        "ts": """
  """,
    },
    {
        "py": """
async def func():
    import asyncio as aio
    a = "abc" * 3
    b = 2 ** 3
  """,
        "ts": """
  """,
    },
    {
        "py": """
def func():
    if foo is None:
        do_foo()
    elif foo is bar:
        do_foo_bar()
    else:
        do()
  """,
        "ts": """
  """,
    },
    {
        "py": """
def func():
    import foo, bar
    import foo.bar as b
    from foo.bar import hello as h, bye as bb
    from ..foo.zoo import bar
    from . import foo
    from .foo import bar
  """,
        "ts": """
  """,
    },
    {
        "py": """
def func():
    def test(a, **kw):
        pass

    test(1, pippo=2, **kw)
  """,
        "ts": """
  """,
    },
    {
        "py": """
class Foo:
    @property
    def bar(self):
        return self

    @bar.setter
    def bar(self, value):
        self._bar = value

    zoo = 1
  """,
        "ts": """
  """,
    },
    {
        "py": """
def func():
    foo = "foofoo"
    foo[1:]
    foo[3:-1]
    foo[2]
  """,
        "ts": """
  """,
    },
    {
        "py": """
def func():
    try:
        do_stuff()
    except ValueError:
        fix_value()
    except IndexError as e:
        fix_ix()
    except:
        do()
    finally:
        closeup()
  """,
        "ts": """
  """,
    },
    {
        "py": """
  """,
        "ts": """
  """,
    },    
]

tests2 = [
    {
        "py": """
class A:
  def __init__(self, value):
      self.value = value
      d = {"a": 1, "b": 2}
      super().__init__(x, y)

  def meth(self):
      super().another_meth(x, y)
  """,
        "ts": """
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
  """,
    },
    {
        "py": """
def func():
    a: str = "foo"
    b: int = 1
  """,
        "ts": """
let a, b;
a = 'foo';
b = 1;
  """,
    },
    {
        "py": """
def func():
    class A:
        async def method(self):
            pass

    class B(A):
        async def method(self):
            await super().method()
  """,
        "ts": """
class A {
  async method() {}
}
class B extends A {
  async method() {
    await A.prototype.method.call(this);
  }
}
  """,
    },
    {
        "py": """
class Foo3:
    @a_deco
    def foo(self):
        return "bar"
  """,
        "ts": """
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
  """,
    },
    {
        "py": """
class Foo3:
    @classmethod
    def foo(self):
        return "bar"
  """,
        "ts": """
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
  """,
    },
    {
        "py": """
def func():
    a = 1
    if a == 0:
        window.alert("Can't be")
    elif a < 0:
        window.alert("Something's wrong")
    else:
        window.alert("That's it")
  """,
        "ts": """
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
  """,
    },
    {
        "py": """
def func():
    class MyError(Exception):
        pass

    class MySecondError(MyError):
        "An error"
  """,
        "ts": """
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
  /* An error */
}
  """,
    },
    {
        "py": """
foo = 5
bar = "boo"
zoo = 10
__all__ = ("foo", "bar", "zoo")
__default__ = "zoo"
def func():
    a = "foo"
    b = {"a": a}
    c = f"value of a={b['a']}"
def func():
    a = "foo"
    c = f"value of a={a!r}"
def func():
    pi = 3.14159
    c = f"pi is greater than {pi:.2}"
  """,
        "ts": """
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
  """,
    },
    {
        "py": """
class Bar:
    def repr(self):
        return f"This is a {self.what}"
  """,
        "ts": """
class Bar {
  repr() {
    return `This is a ${this.what}`;
  }
}
  """,
    },
    {
        "py": """
def func():
    def simple_alert():
        window.alert("Hi there!")

    el = document.querySelector("button")
    el.addEventListener("click", simple_alert)
  """,
        "ts": """
var el;
function simple_alert() {
  window.alert('Hi there!');
}
el = document.querySelector('button');
el.addEventListener('click', simple_alert);
  """,
    },
    {
        "py": """
def func():
    import foo, bar
    import foo.bar as b
    from foo.bar import hello as h, bye as bb
    from ..foo.zoo import bar
    from . import foo
    from .foo import bar

    from __globals__ import test_name

    from foo__bar import zoo
    import foo__bar as fb
    from __foo.bar import zoo
    import __foo.bar as fb
    from foo import __default__ as bar
    from at_tilde_.foo.bar import zoo

    # this should not trigger variable definition
    test_name = 2

    # this instead should do it
    test_foo = True

    __all__ = ["test_name", "test_foo"]
  """,
        "ts": """
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
  """,
    },
    {
        "py": """
class Foo4:
    def __init__(self):
        def bar():
            return 10

        self.bar = bar
  """,
        "ts": """
class Foo4 {
  constructor() {
    var bar;
    bar = () => {
      return 10;
    };
    this.bar = bar;
  }
}
  """,
    },
    {
        "py": """
def func():
    class Example:
        def foo(self):
            def bar():
                pass
  """,
        "ts": """
class Example {
  foo() {
    var bar;
    bar = () => {};
  }
}
  """,
    },
    {
        "py": """
def func2():
    class Example:
        def foo(self):
            def bar():
                def zoo():
                    pass
  """,
        "ts": """
class Example {
  foo() {
    var bar;
    bar = () => {
      var zoo;
      zoo = () => {};
    };
  }
}
  """,
    },
    {
        "py": """
def test_isi():
    a = isinstance(foo, (Bar, Zoo))
def func():
    isinstance(foo, str)
    isinstance(bar, int)
    isinstance(zoo, float)
  """,
        "ts": """
function test_isi() {
  var a;
  a = foo instanceof Bar || foo instanceof Zoo;
}
typeof foo === 'string' || foo instanceof String;
typeof bar === 'number' || bar instanceof Number;
typeof zoo === 'number' || zoo instanceof Number;
  """,
    },
    {
        "py": """
def func():
    def with_kw(a, **kw):
        pass
    with_kw(1, foo=2, bar=3)
  """,
        "ts": """
function with_kw(a, kw = {}) {}
with_kw(1, {foo: 2, bar: 3});
  """,
    },
    {
        "py": """
def test_new():
    a = new(foo())
  """,
        "ts": """
function test_new() {
  var a;
  a = new foo();
}
  """,
    },
    {
        "py": """
class Foo:
    @property
    def bar(self):
        return self._bar

    @bar.setter
    def bar(self, value):
        self._bar = value
  """,
        "ts": """
class Foo {
  get bar() {
    return this._bar;
  }
  set bar(value) {
    this._bar = value;
  }
}
  """,
    },
    {
        "py": """
def test_self_removed():
    def func(self, a, b):
        pass
  """,
        "ts": """
function test_self_removed() {
  function func(a, b) {}
}
  """,
    },
    {
        "py": """
def func():
    foo = "foofoo"
    foo[1:]
    foo[:-1]
    foo[3:-1]
    foo[2]
  """,
        "ts": """
function func() {
  var foo;
  foo = 'foofoo';
  foo.slice(1);
  foo.slice(0, -1);
  foo.slice(3, -1);
  foo[2];
}
  """,
    },
    {
        "py": """
class Foo2:
    def __len__(self):
        return 5

    def __str__(self):
        return "bar"
  """,
        "ts": """
class Foo2 {
  get length() {
    return 5;
  }
  toString() {
    return 'bar';
  }
}
  """,
    },
    {
        "py": """
def func():
    str(x)
  """,
        "ts": """
x.toString();
  """,
    },
    {
        "py": """
def func():
    class Bar(foo(1, 2)):
        pass
    class Bar2(Foo.Zoo):
        pass
  """,
        "ts": """
class Bar extends foo(1, 2) {}
class Bar2 extends Foo.Zoo {}
  """,
    },
    {
        "py": """
def func():
    value = 0
    class MyError(Exception):
        pass
    class MySecondError(MyError):
        "An error"
    class MyThirdError(Exception):
        pass
    class MyFourthError(Exception):
        pass
    try:
        value += 1
        raise MyError("Something bad happened")
        value += 1
    except MySecondError as err:
        value += 20
    except (MyThirdError, MyFourthError) as err2:
        value += 30
    except MyError:
        value += 40
    except:
        value += 50
    finally:
        value += 1
  """,
        "ts": """
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
  /* An error */
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
  """,
    },
    {
        "py": """
def func():
    class MyError(Exception):
        pass
    class MySecondError(MyError):
        "An error"
    try:
        value = 0
        raise MySecondError("This is an error")
    except MySecondError:
        value = 1
  """,
        "ts": """
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
  /* An error */
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
  """,
    },
    {
        "py": """
  """,
        "ts": """
  """,
    },
]
