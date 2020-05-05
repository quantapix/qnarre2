class A:
    def __init__(self, value):
        self.value = value
        d = {"a": 1, "b": 2}
        super().__init__(x, y)

    def meth(self):
        super().another_meth(x, y)


def func():
    a: str = "foo"
    b: int = 1


def func():
    class A:
        async def method(self):
            pass

    class B(A):
        async def method(self):
            await super().method()


class Foo3:
    @a_deco
    def foo(self):
        return "bar"


class Foo3:
    @classmethod
    def foo(self):
        return "bar"


def func():
    a = 1
    if a == 0:
        window.alert("Can't be")
    elif a < 0:
        window.alert("Something's wrong")
    else:
        window.alert("That's it")


def func():
    class MyError(Exception):
        pass

    class MySecondError(MyError):
        """A stupid error"""


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


class Bar:
    def repr(self):
        return f"This is a {self.what}"


def func():
    def simple_alert():
        window.alert("Hi there!")

    el = document.querySelector("button")
    el.addEventListener("click", simple_alert)


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


class Foo4:
    def __init__(self):
        def bar():
            return 10

        self.bar = bar


def func():
    class Example:
        def foo(self):
            def bar():
                pass


def func2():
    class Example:
        def foo(self):
            def bar():
                def zoo():
                    pass


def test_isi():
    a = isinstance(foo, (Bar, Zoo))


def func():

    isinstance(foo, str)
    isinstance(bar, int)
    isinstance(zoo, float)


def func():
    def with_kw(a, **kw):
        pass

    with_kw(1, foo=2, bar=3)


def test_new():
    a = new(foo())


class Foo:
    @property
    def bar(self):
        return self._bar

    @bar.setter
    def bar(self, value):
        self._bar = value


def test_self_removed():
    def func(self, a, b):
        pass


def func():

    foo = "foofoo"
    foo[1:]
    foo[:-1]
    foo[3:-1]
    foo[2]


class Foo2:
    def __len__(self):
        return 5

    def __str__(self):
        return "bar"


def func():

    str(x)


def func():
    class Bar(foo(1, 2)):
        pass

    class Bar2(Foo.Zoo):
        pass


def func():
    value = 0

    class MyError(Exception):
        pass

    class MySecondError(MyError):
        """A stupid error"""

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


def func():
    class MyError(Exception):
        pass

    class MySecondError(MyError):
        """A stupid error"""

    try:
        value = 0
        raise MySecondError("This is an error")
    except MySecondError:
        value = 1
