## requires: python_version < (3,8)
## first_stmt_only: True


def func():
    def afunc(a, b, *args, foo=None, **kw):
        acall(a, b, *args, foo=None, **kw)

        def bfunc(a, b, *, foo=None, **kw):
            pass

        def cfunc(a=1, b=2, *, foo=None):
            pass
