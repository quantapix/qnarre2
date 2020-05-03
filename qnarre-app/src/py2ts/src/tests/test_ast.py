
class TestASTFromFS:

    EXT = {'test_ast_dump': '.ast', 'test_ast_es6': '.js'}

    def test_ast_dump(self, name, py_code, py_src, options, expected, astdump):
        node, dump = astdump(py_code, **options)
        dump = '\n'.join(line.rstrip() for line in dump.splitlines()).rstrip()
        assert dump == expected.rstrip()

    def test_ast_es6(self, name, py_code, py_src, options, expected, astjs):
        dump = str(astjs(py_code, **options))
        dump = '\n'.join(line.rstrip() for line in dump.splitlines()).rstrip()
        assert dump == expected.rstrip()
