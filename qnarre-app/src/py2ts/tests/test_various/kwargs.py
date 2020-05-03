def func():
    def with_kw(a, **kw):
        pass

    with_kw(1, foo=2, bar=3)
