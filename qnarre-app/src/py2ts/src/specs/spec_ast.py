def func():

    __all__ = ["foo", "bar"]

    __all__ = ("foo", "bar")


def func():

    __all__ = ["foo", "bar"]

    __all__ = ("foo", "bar")


def func():
    def afunc(a, b, *args, foo=None, **kw):
        acall(a, b, *args, foo=None, **kw)

        def bfunc(a, b, *, foo=None, **kw):
            pass

        def cfunc(a=1, b=2, *, foo=None):
            pass


def func():
    def afunc(a, b, *args, foo=None, **kw):
        acall(a, b, *args, foo=None, **kw)

        def bfunc(a, b, *, foo=None, **kw):
            pass

        def cfunc(a=1, b=2, *, foo=None):
            pass


def func():
    class TestError(Exception):
        pass

    class TestError2(Exception):
        """Test doc"""


def func():
    class TestError(Exception):
        pass

    class TestError2(Exception):
        """Test doc"""


def func():
    a = "foo"
    return f"value of a={a}"


def func():
    a = "foo"
    return f"value of a={a!r}"


def func():
    a = "foo"
    return f"value of a={a!r}"


def func():
    pi = 3.14159
    return f"π is greater than {pi:.2}"


def func():
    pi = 3.14159
    return f"π is greater than {pi:.2}"


def func():
    pi = 3.14159
    return f"π is greater than {pi:.2}"


def func():
    a = "foo"
    return f"value of a={a}"


async def func():
    import asyncio as aio

    a = "abc" * 3
    b = 2 ** 3


async def func():
    import asyncio as aio

    a = "abc" * 3
    b = 2 ** 3


def func():

    if foo is None:
        do_foo()
    elif foo is bar:
        do_foo_bar()
    else:
        do()


def func():

    if foo is None:
        do_foo()
    elif foo is bar:
        do_foo_bar()
    else:
        do()


def func():
    import foo, bar
    import foo.bar as b
    from foo.bar import hello as h, bye as bb
    from ..foo.zoo import bar
    from . import foo
    from .foo import bar


def func():
    import foo, bar
    import foo.bar as b
    from foo.bar import hello as h, bye as bb
    from ..foo.zoo import bar
    from . import foo
    from .foo import bar


def func():
    def test(a, **kw):
        pass

    test(1, pippo=2, **kw)


class Foo:
    @property
    def bar(self):

        return self

    @bar.setter
    def bar(self, value):
        self._bar = value

    zoo = 1


class Foo:
    @property
    def bar(self):

        return self

    @bar.setter
    def bar(self, value):
        self._bar = value

    zoo = 1


def func():

    foo = "foofoo"
    foo[1:]
    foo[3:-1]
    foo[2]


def func():

    foo = "foofoo"
    foo[1:]
    foo[3:-1]
    foo[2]


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
