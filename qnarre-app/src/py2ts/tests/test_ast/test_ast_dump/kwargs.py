## requires: python_version < (3,8)
def func():
    def test(a, **kw):
        pass

    test(1, pippo=2, **kw)
