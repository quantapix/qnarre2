import ast
import dis
import os
import sys
import pytest
import warnings
import weakref
from textwrap import dedent

from test import support


def to_tuple(t):
    if t is None or isinstance(t, (str, int, complex)):
        return t
    elif isinstance(t, list):
        return [to_tuple(e) for e in t]
    result = [t.__class__.__name__]
    if hasattr(t, "lineno") and hasattr(t, "col_offset"):
        result.append((t.lineno, t.col_offset))
        if hasattr(t, "end_lineno") and hasattr(t, "end_col_offset"):
            result[-1] += (t.end_lineno, t.end_col_offset)
    if t._fields is None:
        return tuple(result)
    for f in t._fields:
        result.append(to_tuple(getattr(t, f)))
    return tuple(result)


exec_tests = [
    # None
    "None",
    # Module docstring
    "'module docstring'",
    # FunctionDef
    "def f(): pass",
    # FunctionDef with docstring
    "def f(): 'function docstring'",
    # FunctionDef with arg
    "def f(a): pass",
    # FunctionDef with arg and default value
    "def f(a=0): pass",
    # FunctionDef with varargs
    "def f(*args): pass",
    # FunctionDef with kwargs
    "def f(**kwargs): pass",
    # FunctionDef with all kind of args and docstring
    "def f(a, b=1, c=None, d=[], e={}, *args, f=42, **kwargs): 'doc for f()'",
    # ClassDef
    "class C:pass",
    # ClassDef with docstring
    "class C: 'docstring for class C'",
    # ClassDef, new style class
    "class C(object): pass",
    # Return
    "def f():return 1",
    # Delete
    "del v",
    # Assign
    "v = 1",
    "a,b = c",
    "(a,b) = c",
    "[a,b] = c",
    # AugAssign
    "v += 1",
    # For
    "for v in v:pass",
    # While
    "while v:pass",
    # If
    "if v:pass",
    # If-Elif
    "if a:\n  pass\nelif b:\n  pass",
    # If-Elif-Else
    "if a:\n  pass\nelif b:\n  pass\nelse:\n  pass",
    # With
    "with x as y: pass",
    "with x as y, z as q: pass",
    # Raise
    "raise Exception('string')",
    # TryExcept
    "try:\n  pass\nexcept Exception:\n  pass",
    # TryFinally
    "try:\n  pass\nfinally:\n  pass",
    # Assert
    "assert v",
    # Import
    "import sys",
    # ImportFrom
    "from sys import v",
    # Global
    "global v",
    # Expr
    "1",
    # Pass,
    "pass",
    # Break
    "for v in v:break",
    # Continue
    "for v in v:continue",
    # for statements with naked tuples (see http://bugs.python.org/issue6704)
    "for a,b in c: pass",
    "for (a,b) in c: pass",
    "for [a,b] in c: pass",
    # Multiline generator expression (test for .lineno & .col_offset)
    """(
    (
    Aa
    ,
       Bb
    )
    for
    Aa
    ,
    Bb in Cc
    )""",
    # dictcomp
    "{a : b for w in x for m in p if g}",
    # dictcomp with naked tuple
    "{a : b for v,w in x}",
    # setcomp
    "{r for l in x if g}",
    # setcomp with naked tuple
    "{r for l,m in x}",
    # AsyncFunctionDef
    "async def f():\n 'async function'\n await something()",
    # AsyncFor
    "async def f():\n async for e in i: 1\n else: 2",
    # AsyncWith
    "async def f():\n async with a as b: 1",
    # PEP 448: Additional Unpacking Generalizations
    "{**{1:2}, 2:3}",
    "{*{1, 2}, 3}",
    # Asynchronous comprehensions
    "async def f():\n [i async for b in c]",
    # Decorated FunctionDef
    "@deco1\n@deco2()\n@deco3(1)\ndef f(): pass",
    # Decorated AsyncFunctionDef
    "@deco1\n@deco2()\n@deco3(1)\nasync def f(): pass",
    # Decorated ClassDef
    "@deco1\n@deco2()\n@deco3(1)\nclass C: pass",
    # Decorator with generator argument
    "@deco(a for a in b)\ndef f(): pass",
    # Decorator with attribute
    "@a.b.c\ndef f(): pass",
    # Simple assignment expression
    "(a := 1)",
    # Positional-only arguments
    "def f(a, /,): pass",
    "def f(a, /, c, d, e): pass",
    "def f(a, /, c, *, d, e): pass",
    "def f(a, /, c, *, d, e, **kwargs): pass",
    # Positional-only arguments with defaults
    "def f(a=1, /,): pass",
    "def f(a=1, /, b=2, c=4): pass",
    "def f(a=1, /, b=2, *, c=4): pass",
    "def f(a=1, /, b=2, *, c): pass",
    "def f(a=1, /, b=2, *, c=4, **kwargs): pass",
    "def f(a=1, /, b=2, *, c, **kwargs): pass",
]


single_tests = ["1+2"]


eval_tests = [
    # None
    "None",
    # BoolOp
    "a and b",
    # BinOp
    "a + b",
    # UnaryOp
    "not v",
    # Lambda
    "lambda:None",
    # Dict
    "{ 1:2 }",
    # Empty dict
    "{}",
    # Set
    "{None,}",
    # Multiline dict (test for .lineno & .col_offset)
    """{
      1
        :
          2
     }""",
    # ListComp
    "[a for b in c if d]",
    # GeneratorExp
    "(a for b in c if d)",
    # Comprehensions with multiple for targets
    "[(a,b) for a,b in c]",
    "[(a,b) for (a,b) in c]",
    "[(a,b) for [a,b] in c]",
    "{(a,b) for a,b in c}",
    "{(a,b) for (a,b) in c}",
    "{(a,b) for [a,b] in c}",
    "((a,b) for a,b in c)",
    "((a,b) for (a,b) in c)",
    "((a,b) for [a,b] in c)",
    # Yield - yield expressions can't work outside a function
    #
    # Compare
    "1 < 2 < 3",
    # Call
    "f(1,2,c=3,*d,**e)",
    # Call with multi-character starred
    "f(*[0, 1])",
    # Call with a generator argument
    "f(a for a in b)",
    # Num
    "10",
    # Str
    "'string'",
    # Attribute
    "a.b",
    # Subscript
    "a[b:c]",
    # Name
    "v",
    # List
    "[1,2,3]",
    # Empty list
    "[]",
    # Tuple
    "1,2,3",
    # Tuple
    "(1,2,3)",
    # Empty tuple
    "()",
    # Combination
    "a.b.c.d(a.b[1:2])",
]


class TestAST:
    def _is_ast_node(self, name, node):
        if not isinstance(node, type):
            return False
        if "ast" not in node.__module__:
            return False
        return name != "AST" and name[0].isupper()

    def _assertTrueorder(self, ast_node, parent_pos):
        if not isinstance(ast_node, ast.AST) or ast_node._fields is None:
            return
        if isinstance(ast_node, (ast.expr, ast.stmt, ast.excepthandler)):
            node_pos = (ast_node.lineno, ast_node.col_offset)
            assert node_pos >= parent_pos
            parent_pos = (ast_node.lineno, ast_node.col_offset)
        for name in ast_node._fields:
            value = getattr(ast_node, name)
            if isinstance(value, list):
                first_pos = parent_pos
                if value and name == "decorator_list":
                    first_pos = (value[0].lineno, value[0].col_offset)
                for child in value:
                    self._assertTrueorder(child, first_pos)
            elif value is not None:
                self._assertTrueorder(value, parent_pos)

    def test_AST_objects(self):
        x = ast.AST()
        assert x._fields == ()
        x.foobar = 42
        assert x.foobar == 42
        assert x.__dict__["foobar"] == 42
        with pytest.raises(AttributeError):
            x.vararg
        with pytest.raises(TypeError):
            ast.AST(2)

    def test_AST_garbage_collection(self):
        class X:
            pass

        a = ast.AST()
        a.x = X()
        a.x.a = a
        ref = weakref.ref(a.x)
        del a
        support.gc_collect()
        assert ref() is None

    def test_snippets(self):
        for input, output, kind in (
            (exec_tests, exec_results, "exec"),
            (single_tests, single_results, "single"),
            (eval_tests, eval_results, "eval"),
        ):
            for i, o in zip(input, output):
                ast_tree = compile(i, "?", kind, ast.PyCF_ONLY_AST)
                assert to_tuple(ast_tree) == o
                self._assertTrueorder(ast_tree, (0, 0))
                compile(ast_tree, "?", kind)

    def test_ast_validation(self):
        snippets_to_validate = exec_tests + single_tests + eval_tests
        for snippet in snippets_to_validate:
            tree = ast.parse(snippet)
            compile(tree, "<string>", "exec")

    def test_slice(self):
        slc = ast.parse("x[::]").body[0].value.slice
        assert slc.upper is None
        assert slc.lower is None
        assert slc.step is None

    def test_from_import(self):
        im = ast.parse("from . import y").body[0]
        assert im.module is None

    def test_non_interned_future_from_ast(self):
        mod = ast.parse("from __future__ import division")
        assert isinstance(mod.body[0], ast.ImportFrom)
        mod.body[0].module = " __future__ ".strip()
        compile(mod, "<test>", "exec")

    def test_base_classes(self):
        assert issubclass(ast.For, ast.stmt) is True
        assert issubclass(ast.Name, ast.expr) is True
        assert issubclass(ast.stmt, ast.AST) is True
        assert issubclass(ast.expr, ast.AST) is True
        assert issubclass(ast.comprehension, ast.AST) is True
        assert issubclass(ast.Gt, ast.AST) is True

    def test_field_attr_existence(self):
        for name, item in ast.__dict__.items():
            if self._is_ast_node(name, item):
                if name == "Index":
                    continue
                x = item()
                if isinstance(x, ast.AST):
                    assert type(x._fields) == tuple

    def test_arguments(self):
        x = ast.arguments()
        assert x._fields == (
            "posonlyargs",
            "args",
            "vararg",
            "kwonlyargs",
            "kw_defaults",
            "kwarg",
            "defaults",
        )
        with pytest.raises(AttributeError):
            x.args
        assert not hasattr(x, "vararg")
        x = ast.arguments(*range(1, 8))
        assert x.args == 2
        assert x.vararg == 3

    def test_field_attr_writable(self):
        x = ast.Constant()
        # We can assign to _fields
        x._fields = 666
        assert x._fields == 666

    def test_classattrs(self):
        x = ast.Constant()
        assert x._fields == ("value", "kind")
        with pytest.raises(AttributeError):
            x.value
        with pytest.raises(AttributeError):
            x.n
        x = ast.Constant(42)
        assert x.value == 42
        assert x.n == 42
        with pytest.raises(AttributeError):
            x.lineno
        with pytest.raises(AttributeError):
            x.foobar
        x = ast.Constant(lineno=2)
        assert x.lineno == 2
        x = ast.Constant(42, lineno=0)
        assert x.lineno == 0
        assert x._fields == ("value", "kind")
        assert x.value == 42
        assert x.n == 42

        pytest.raises(TypeError, ast.Constant, 1, None, 2)
        pytest.raises(TypeError, ast.Constant, 1, None, 2, lineno=0)

        assert ast.Constant(42).n == 42
        assert ast.Constant(4.25).n == 4.25
        assert ast.Constant(4.25j).n == 4.25j
        assert ast.Str("42").s == "42"
        assert ast.Bytes(b"42").s == b"42"
        assert ast.Constant(True).value == True
        assert ast.Constant(False).value == False
        assert ast.Constant(None).value == None

        assert ast.Constant(42).value == 42
        assert ast.Constant(4.25).value == 4.25
        assert ast.Constant(4.25j).value == 4.25j
        assert ast.Constant("42").value == "42"
        assert ast.Constant(b"42").value == b"42"
        assert ast.Constant(True).value == True
        assert ast.Constant(False).value == False
        assert ast.Constant(None).value == None
        assert ast.Constant(...).value == ...

    def test_realtype(self):
        assert type(ast.Constant(42)) == ast.Constant
        assert type(ast.Constant(4.25)) == ast.Constant
        assert type(ast.Constant(4.25j)) == ast.Constant
        assert type(ast.Str("42")) == ast.Constant
        assert type(ast.Bytes(b"42")) == ast.Constant
        assert type(ast.Constant(True)) == ast.Constant
        assert type(ast.Constant(False)) == ast.Constant
        assert type(ast.Constant(None)) == ast.Constant
        assert type(ast.Ellipsis()) == ast.Constant

    def test_isinstance(self):
        assert isinstance(ast.Constant(42), ast.Constant)
        assert isinstance(ast.Constant(4.2), ast.Constant)
        assert isinstance(ast.Constant(4.2j), ast.Constant)
        assert isinstance(ast.Str("42"), ast.Str)
        assert isinstance(ast.Bytes(b"42"), ast.Bytes)
        assert isinstance(ast.Constant(True), ast.NameConstant)
        assert isinstance(ast.Constant(False), ast.NameConstant)
        assert isinstance(ast.Constant(None), ast.NameConstant)
        assert isinstance(ast.Ellipsis(), ast.Ellipsis)

        assert isinstance(ast.Constant(42), ast.Constant)
        assert isinstance(ast.Constant(4.2), ast.Constant)
        assert isinstance(ast.Constant(4.2j), ast.Constant)
        assert isinstance(ast.Constant("42"), ast.Str)
        assert isinstance(ast.Constant(b"42"), ast.Bytes)
        assert isinstance(ast.Constant(True), ast.NameConstant)
        assert isinstance(ast.Constant(False), ast.NameConstant)
        assert isinstance(ast.Constant(None), ast.NameConstant)
        assert isinstance(ast.Constant(...), ast.Ellipsis)

        assert isinstance(ast.Str("42"), ast.Constant)
        assert not isinstance(ast.Constant(42), ast.Str)
        assert not isinstance(ast.Str("42"), ast.Bytes)
        assert not isinstance(ast.Constant(42), ast.NameConstant)
        assert not isinstance(ast.Constant(42), ast.Ellipsis)
        assert isinstance(ast.Constant(True), ast.Constant)
        assert isinstance(ast.Constant(False), ast.Constant)

        assert isinstance(ast.Constant("42"), ast.Constant)
        assert not isinstance(ast.Constant("42"), ast.Bytes)

        assert isinstance(ast.Constant(), ast.Constant)
        assert not isinstance(ast.Constant(), ast.Str)
        assert not isinstance(ast.Constant(), ast.Bytes)
        assert not isinstance(ast.Constant(), ast.NameConstant)
        assert not isinstance(ast.Constant(), ast.Ellipsis)

        class S(str):
            pass

        assert isinstance(ast.Constant(S("42")), ast.Str)
        assert isinstance(ast.Constant(S("42")), ast.Constant)

    def test_subclasses(self):
        class N(ast.Constant):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                self.z = "spam"

        class N2(ast.Constant):
            pass

        n = N(42)
        assert n.n == 42
        assert n.z == "spam"
        assert type(n) == N
        assert isinstance(n, N) is True
        assert isinstance(n, ast.Constant) is True
        assert not (isinstance(n, N2))
        assert not (isinstance(ast.Constant(42), N))
        n = N(n=42)
        assert n.n == 42
        assert type(n) == N

    def test_module(self):
        body = [ast.Constant(42)]
        x = ast.Module(body, [])
        assert x.body == body

    def test_nodeclasses(self):
        # Zero arguments constructor explicitly allowed
        x = ast.BinOp()
        assert x._fields == ("left", "op", "right")

        # Random attribute allowed too
        x.foobarbaz = 5
        assert x.foobarbaz == 5

        n1 = ast.Constant(1)
        n3 = ast.Constant(3)
        addop = ast.Add()
        x = ast.BinOp(n1, addop, n3)
        assert x.left == n1
        assert x.op == addop
        assert x.right == n3

        x = ast.BinOp(1, 2, 3)
        assert x.left == 1
        assert x.op == 2
        assert x.right == 3

        x = ast.BinOp(1, 2, 3, lineno=0)
        assert x.left == 1
        assert x.op == 2
        assert x.right == 3
        assert x.lineno == 0

        # node raises exception when given too many arguments
        pytest.raises(TypeError, ast.BinOp, 1, 2, 3, 4)
        # node raises exception when given too many arguments
        pytest.raises(TypeError, ast.BinOp, 1, 2, 3, 4, lineno=0)

        # can set attributes through kwargs too
        x = ast.BinOp(left=1, op=2, right=3, lineno=0)
        assert x.left == 1
        assert x.op == 2
        assert x.right == 3
        assert x.lineno == 0

        # Random kwargs also allowed
        x = ast.BinOp(1, 2, 3, foobarbaz=42)
        assert x.foobarbaz == 42

    def test_no_fields(self):
        # this used to fail because Sub._fields was None
        x = ast.Sub()
        assert x._fields == ()

    def test_pickling(self):
        import pickle

        mods = [pickle]
        try:
            import cPickle

            mods.append(cPickle)
        except ImportError:
            pass
        protocols = [0, 1, 2]
        for mod in mods:
            for protocol in protocols:
                for ast in (compile(i, "?", "exec", 0x400) for i in exec_tests):
                    ast2 = mod.loads(mod.dumps(ast, protocol))
                    assert to_tuple(ast2) == to_tuple(ast)

    def test_invalid_sum(self):
        pos = dict(lineno=2, col_offset=3)
        m = ast.Module([ast.Expr(ast.expr(**pos), **pos)], [])
        with pytest.raises(TypeError) as cm:
            compile(m, "<test>", "exec")
        self.assertIn("but got <ast.expr", str(cm.exception))

    def test_invalid_identifier(self):
        m = ast.Module([ast.Expr(ast.Name(42, ast.Load()))], [])
        ast.fix_missing_locations(m)
        with pytest.raises(TypeError) as cm:
            compile(m, "<test>", "exec")
        self.assertIn("identifier must be of type str", str(cm.exception))

    def test_invalid_constant(self):
        for invalid_constant in int, (1, 2, int), frozenset((1, 2, int)):
            e = ast.Expression(body=ast.Constant(invalid_constant))
            ast.fix_missing_locations(e)
            with self.assertRaisesRegex(TypeError, "invalid type in Constant: type"):
                compile(e, "<test>", "eval")

    def test_empty_yield_from(self):
        # Issue 16546: yield from value is not optional.
        empty_yield_from = ast.parse("def f():\n yield from g()")
        empty_yield_from.body[0].body[0].value.value = None
        with pytest.raises(ValueError) as cm:
            compile(empty_yield_from, "<test>", "exec")
        self.assertIn("field value is required", str(cm.exception))

    @support.cpython_only
    def test_issue31592(self):
        # There shouldn't be an assertion failure in case of a bad
        # unicodedata.normalize().
        import unicodedata

        def bad_normalize(*args):
            return None

        with support.swap_attr(unicodedata, "normalize", bad_normalize):
            pytest.raises(TypeError, ast.parse, "\u03D5")

    def test_issue18374_binop_col_offset(self):
        tree = ast.parse("4+5+6+7")
        parent_binop = tree.body[0].value
        child_binop = parent_binop.left
        grandchild_binop = child_binop.left
        assert parent_binop.col_offset == 0
        assert parent_binop.end_col_offset == 7
        assert child_binop.col_offset == 0
        assert child_binop.end_col_offset == 5
        assert grandchild_binop.col_offset == 0
        assert grandchild_binop.end_col_offset == 3

        tree = ast.parse("4+5-\\\n 6-7")
        parent_binop = tree.body[0].value
        child_binop = parent_binop.left
        grandchild_binop = child_binop.left
        assert parent_binop.col_offset == 0
        assert parent_binop.lineno == 1
        assert parent_binop.end_col_offset == 4
        assert parent_binop.end_lineno == 2

        assert child_binop.col_offset == 0
        assert child_binop.lineno == 1
        assert child_binop.end_col_offset == 2
        assert child_binop.end_lineno == 2

        assert grandchild_binop.col_offset == 0
        assert grandchild_binop.lineno == 1
        assert grandchild_binop.end_col_offset == 3
        assert grandchild_binop.end_lineno == 1

    def test_issue39579_dotted_name_end_col_offset(self):
        tree = ast.parse("@a.b.c\ndef f(): pass")
        attr_b = tree.body[0].decorator_list[0].value
        assert attr_b.end_col_offset == 4

    def test_ast_asdl_signature(self):
        assert (
            ast.withitem.__doc__ == "withitem(expr context_expr, expr? optional_vars)"
        )

        assert ast.GtE.__doc__ == "GtE"
        assert ast.Name.__doc__ == "Name(identifier id, expr_context ctx)"
        assert (
            ast.cmpop.__doc__
            == "cmpop = Eq | NotEq | Lt | LtE | Gt | GtE | Is | IsNot | In | NotIn"
        )

        expressions = [f"     | {node.__doc__}" for node in ast.expr.__subclasses__()]
        expressions[0] = f"expr = {ast.expr.__subclasses__()[0].__doc__}"
        self.assertCountEqual(ast.expr.__doc__.split("\n"), expressions)


#### EVERYTHING BELOW IS GENERATED BY python Lib/test/test_ast.py -g  #####
exec_results = [
    ("Module", [("Expr", (1, 0, 1, 4), ("Constant", (1, 0, 1, 4), None, None))], []),
    (
        "Module",
        [
            (
                "Expr",
                (1, 0, 1, 18),
                ("Constant", (1, 0, 1, 18), "module docstring", None),
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 13),
                "f",
                ("arguments", [], [], None, [], [], None, []),
                [("Pass", (1, 9, 1, 13))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 29),
                "f",
                ("arguments", [], [], None, [], [], None, []),
                [
                    (
                        "Expr",
                        (1, 9, 1, 29),
                        ("Constant", (1, 9, 1, 29), "function docstring", None),
                    )
                ],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 14),
                "f",
                (
                    "arguments",
                    [],
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    None,
                    [],
                    [],
                    None,
                    [],
                ),
                [("Pass", (1, 10, 1, 14))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 16),
                "f",
                (
                    "arguments",
                    [],
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    None,
                    [],
                    [],
                    None,
                    [("Constant", (1, 8, 1, 9), 0, None)],
                ),
                [("Pass", (1, 12, 1, 16))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 18),
                "f",
                (
                    "arguments",
                    [],
                    [],
                    ("arg", (1, 7, 1, 11), "args", None, None),
                    [],
                    [],
                    None,
                    [],
                ),
                [("Pass", (1, 14, 1, 18))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 21),
                "f",
                (
                    "arguments",
                    [],
                    [],
                    None,
                    [],
                    [],
                    ("arg", (1, 8, 1, 14), "kwargs", None, None),
                    [],
                ),
                [("Pass", (1, 17, 1, 21))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 71),
                "f",
                (
                    "arguments",
                    [],
                    [
                        ("arg", (1, 6, 1, 7), "a", None, None),
                        ("arg", (1, 9, 1, 10), "b", None, None),
                        ("arg", (1, 14, 1, 15), "c", None, None),
                        ("arg", (1, 22, 1, 23), "d", None, None),
                        ("arg", (1, 28, 1, 29), "e", None, None),
                    ],
                    ("arg", (1, 35, 1, 39), "args", None, None),
                    [("arg", (1, 41, 1, 42), "f", None, None)],
                    [("Constant", (1, 43, 1, 45), 42, None)],
                    ("arg", (1, 49, 1, 55), "kwargs", None, None),
                    [
                        ("Constant", (1, 11, 1, 12), 1, None),
                        ("Constant", (1, 16, 1, 20), None, None),
                        ("List", (1, 24, 1, 26), [], ("Load",)),
                        ("Dict", (1, 30, 1, 32), [], []),
                    ],
                ),
                [
                    (
                        "Expr",
                        (1, 58, 1, 71),
                        ("Constant", (1, 58, 1, 71), "doc for f()", None),
                    )
                ],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [("ClassDef", (1, 0, 1, 12), "C", [], [], [("Pass", (1, 8, 1, 12))], [])],
        [],
    ),
    (
        "Module",
        [
            (
                "ClassDef",
                (1, 0, 1, 32),
                "C",
                [],
                [],
                [
                    (
                        "Expr",
                        (1, 9, 1, 32),
                        ("Constant", (1, 9, 1, 32), "docstring for class C", None),
                    )
                ],
                [],
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "ClassDef",
                (1, 0, 1, 21),
                "C",
                [("Name", (1, 8, 1, 14), "object", ("Load",))],
                [],
                [("Pass", (1, 17, 1, 21))],
                [],
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 16),
                "f",
                ("arguments", [], [], None, [], [], None, []),
                [("Return", (1, 8, 1, 16), ("Constant", (1, 15, 1, 16), 1, None))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    ("Module", [("Delete", (1, 0, 1, 5), [("Name", (1, 4, 1, 5), "v", ("Del",))])], []),
    (
        "Module",
        [
            (
                "Assign",
                (1, 0, 1, 5),
                [("Name", (1, 0, 1, 1), "v", ("Store",))],
                ("Constant", (1, 4, 1, 5), 1, None),
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Assign",
                (1, 0, 1, 7),
                [
                    (
                        "Tuple",
                        (1, 0, 1, 3),
                        [
                            ("Name", (1, 0, 1, 1), "a", ("Store",)),
                            ("Name", (1, 2, 1, 3), "b", ("Store",)),
                        ],
                        ("Store",),
                    )
                ],
                ("Name", (1, 6, 1, 7), "c", ("Load",)),
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Assign",
                (1, 0, 1, 9),
                [
                    (
                        "Tuple",
                        (1, 0, 1, 5),
                        [
                            ("Name", (1, 1, 1, 2), "a", ("Store",)),
                            ("Name", (1, 3, 1, 4), "b", ("Store",)),
                        ],
                        ("Store",),
                    )
                ],
                ("Name", (1, 8, 1, 9), "c", ("Load",)),
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Assign",
                (1, 0, 1, 9),
                [
                    (
                        "List",
                        (1, 0, 1, 5),
                        [
                            ("Name", (1, 1, 1, 2), "a", ("Store",)),
                            ("Name", (1, 3, 1, 4), "b", ("Store",)),
                        ],
                        ("Store",),
                    )
                ],
                ("Name", (1, 8, 1, 9), "c", ("Load",)),
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "AugAssign",
                (1, 0, 1, 6),
                ("Name", (1, 0, 1, 1), "v", ("Store",)),
                ("Add",),
                ("Constant", (1, 5, 1, 6), 1, None),
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "For",
                (1, 0, 1, 15),
                ("Name", (1, 4, 1, 5), "v", ("Store",)),
                ("Name", (1, 9, 1, 10), "v", ("Load",)),
                [("Pass", (1, 11, 1, 15))],
                [],
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "While",
                (1, 0, 1, 12),
                ("Name", (1, 6, 1, 7), "v", ("Load",)),
                [("Pass", (1, 8, 1, 12))],
                [],
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "If",
                (1, 0, 1, 9),
                ("Name", (1, 3, 1, 4), "v", ("Load",)),
                [("Pass", (1, 5, 1, 9))],
                [],
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "If",
                (1, 0, 4, 6),
                ("Name", (1, 3, 1, 4), "a", ("Load",)),
                [("Pass", (2, 2, 2, 6))],
                [
                    (
                        "If",
                        (3, 0, 4, 6),
                        ("Name", (3, 5, 3, 6), "b", ("Load",)),
                        [("Pass", (4, 2, 4, 6))],
                        [],
                    )
                ],
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "If",
                (1, 0, 6, 6),
                ("Name", (1, 3, 1, 4), "a", ("Load",)),
                [("Pass", (2, 2, 2, 6))],
                [
                    (
                        "If",
                        (3, 0, 6, 6),
                        ("Name", (3, 5, 3, 6), "b", ("Load",)),
                        [("Pass", (4, 2, 4, 6))],
                        [("Pass", (6, 2, 6, 6))],
                    )
                ],
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "With",
                (1, 0, 1, 17),
                [
                    (
                        "withitem",
                        ("Name", (1, 5, 1, 6), "x", ("Load",)),
                        ("Name", (1, 10, 1, 11), "y", ("Store",)),
                    )
                ],
                [("Pass", (1, 13, 1, 17))],
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "With",
                (1, 0, 1, 25),
                [
                    (
                        "withitem",
                        ("Name", (1, 5, 1, 6), "x", ("Load",)),
                        ("Name", (1, 10, 1, 11), "y", ("Store",)),
                    ),
                    (
                        "withitem",
                        ("Name", (1, 13, 1, 14), "z", ("Load",)),
                        ("Name", (1, 18, 1, 19), "q", ("Store",)),
                    ),
                ],
                [("Pass", (1, 21, 1, 25))],
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Raise",
                (1, 0, 1, 25),
                (
                    "Call",
                    (1, 6, 1, 25),
                    ("Name", (1, 6, 1, 15), "Exception", ("Load",)),
                    [("Constant", (1, 16, 1, 24), "string", None)],
                    [],
                ),
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Try",
                (1, 0, 4, 6),
                [("Pass", (2, 2, 2, 6))],
                [
                    (
                        "ExceptHandler",
                        (3, 0, 4, 6),
                        ("Name", (3, 7, 3, 16), "Exception", ("Load",)),
                        None,
                        [("Pass", (4, 2, 4, 6))],
                    )
                ],
                [],
                [],
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Try",
                (1, 0, 4, 6),
                [("Pass", (2, 2, 2, 6))],
                [],
                [],
                [("Pass", (4, 2, 4, 6))],
            )
        ],
        [],
    ),
    (
        "Module",
        [("Assert", (1, 0, 1, 8), ("Name", (1, 7, 1, 8), "v", ("Load",)), None)],
        [],
    ),
    ("Module", [("Import", (1, 0, 1, 10), [("alias", "sys", None)])], []),
    ("Module", [("ImportFrom", (1, 0, 1, 17), "sys", [("alias", "v", None)], 0)], []),
    ("Module", [("Global", (1, 0, 1, 8), ["v"])], []),
    ("Module", [("Expr", (1, 0, 1, 1), ("Constant", (1, 0, 1, 1), 1, None))], []),
    ("Module", [("Pass", (1, 0, 1, 4))], []),
    (
        "Module",
        [
            (
                "For",
                (1, 0, 1, 16),
                ("Name", (1, 4, 1, 5), "v", ("Store",)),
                ("Name", (1, 9, 1, 10), "v", ("Load",)),
                [("Break", (1, 11, 1, 16))],
                [],
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "For",
                (1, 0, 1, 19),
                ("Name", (1, 4, 1, 5), "v", ("Store",)),
                ("Name", (1, 9, 1, 10), "v", ("Load",)),
                [("Continue", (1, 11, 1, 19))],
                [],
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "For",
                (1, 0, 1, 18),
                (
                    "Tuple",
                    (1, 4, 1, 7),
                    [
                        ("Name", (1, 4, 1, 5), "a", ("Store",)),
                        ("Name", (1, 6, 1, 7), "b", ("Store",)),
                    ],
                    ("Store",),
                ),
                ("Name", (1, 11, 1, 12), "c", ("Load",)),
                [("Pass", (1, 14, 1, 18))],
                [],
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "For",
                (1, 0, 1, 20),
                (
                    "Tuple",
                    (1, 4, 1, 9),
                    [
                        ("Name", (1, 5, 1, 6), "a", ("Store",)),
                        ("Name", (1, 7, 1, 8), "b", ("Store",)),
                    ],
                    ("Store",),
                ),
                ("Name", (1, 13, 1, 14), "c", ("Load",)),
                [("Pass", (1, 16, 1, 20))],
                [],
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "For",
                (1, 0, 1, 20),
                (
                    "List",
                    (1, 4, 1, 9),
                    [
                        ("Name", (1, 5, 1, 6), "a", ("Store",)),
                        ("Name", (1, 7, 1, 8), "b", ("Store",)),
                    ],
                    ("Store",),
                ),
                ("Name", (1, 13, 1, 14), "c", ("Load",)),
                [("Pass", (1, 16, 1, 20))],
                [],
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Expr",
                (1, 0, 11, 5),
                (
                    "GeneratorExp",
                    (1, 0, 11, 5),
                    (
                        "Tuple",
                        (2, 4, 6, 5),
                        [
                            ("Name", (3, 4, 3, 6), "Aa", ("Load",)),
                            ("Name", (5, 7, 5, 9), "Bb", ("Load",)),
                        ],
                        ("Load",),
                    ),
                    [
                        (
                            "comprehension",
                            (
                                "Tuple",
                                (8, 4, 10, 6),
                                [
                                    ("Name", (8, 4, 8, 6), "Aa", ("Store",)),
                                    ("Name", (10, 4, 10, 6), "Bb", ("Store",)),
                                ],
                                ("Store",),
                            ),
                            ("Name", (10, 10, 10, 12), "Cc", ("Load",)),
                            [],
                            0,
                        )
                    ],
                ),
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Expr",
                (1, 0, 1, 34),
                (
                    "DictComp",
                    (1, 0, 1, 34),
                    ("Name", (1, 1, 1, 2), "a", ("Load",)),
                    ("Name", (1, 5, 1, 6), "b", ("Load",)),
                    [
                        (
                            "comprehension",
                            ("Name", (1, 11, 1, 12), "w", ("Store",)),
                            ("Name", (1, 16, 1, 17), "x", ("Load",)),
                            [],
                            0,
                        ),
                        (
                            "comprehension",
                            ("Name", (1, 22, 1, 23), "m", ("Store",)),
                            ("Name", (1, 27, 1, 28), "p", ("Load",)),
                            [("Name", (1, 32, 1, 33), "g", ("Load",))],
                            0,
                        ),
                    ],
                ),
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Expr",
                (1, 0, 1, 20),
                (
                    "DictComp",
                    (1, 0, 1, 20),
                    ("Name", (1, 1, 1, 2), "a", ("Load",)),
                    ("Name", (1, 5, 1, 6), "b", ("Load",)),
                    [
                        (
                            "comprehension",
                            (
                                "Tuple",
                                (1, 11, 1, 14),
                                [
                                    ("Name", (1, 11, 1, 12), "v", ("Store",)),
                                    ("Name", (1, 13, 1, 14), "w", ("Store",)),
                                ],
                                ("Store",),
                            ),
                            ("Name", (1, 18, 1, 19), "x", ("Load",)),
                            [],
                            0,
                        )
                    ],
                ),
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Expr",
                (1, 0, 1, 19),
                (
                    "SetComp",
                    (1, 0, 1, 19),
                    ("Name", (1, 1, 1, 2), "r", ("Load",)),
                    [
                        (
                            "comprehension",
                            ("Name", (1, 7, 1, 8), "l", ("Store",)),
                            ("Name", (1, 12, 1, 13), "x", ("Load",)),
                            [("Name", (1, 17, 1, 18), "g", ("Load",))],
                            0,
                        )
                    ],
                ),
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Expr",
                (1, 0, 1, 16),
                (
                    "SetComp",
                    (1, 0, 1, 16),
                    ("Name", (1, 1, 1, 2), "r", ("Load",)),
                    [
                        (
                            "comprehension",
                            (
                                "Tuple",
                                (1, 7, 1, 10),
                                [
                                    ("Name", (1, 7, 1, 8), "l", ("Store",)),
                                    ("Name", (1, 9, 1, 10), "m", ("Store",)),
                                ],
                                ("Store",),
                            ),
                            ("Name", (1, 14, 1, 15), "x", ("Load",)),
                            [],
                            0,
                        )
                    ],
                ),
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "AsyncFunctionDef",
                (1, 0, 3, 18),
                "f",
                ("arguments", [], [], None, [], [], None, []),
                [
                    (
                        "Expr",
                        (2, 1, 2, 17),
                        ("Constant", (2, 1, 2, 17), "async function", None),
                    ),
                    (
                        "Expr",
                        (3, 1, 3, 18),
                        (
                            "Await",
                            (3, 1, 3, 18),
                            (
                                "Call",
                                (3, 7, 3, 18),
                                ("Name", (3, 7, 3, 16), "something", ("Load",)),
                                [],
                                [],
                            ),
                        ),
                    ),
                ],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "AsyncFunctionDef",
                (1, 0, 3, 8),
                "f",
                ("arguments", [], [], None, [], [], None, []),
                [
                    (
                        "AsyncFor",
                        (2, 1, 3, 8),
                        ("Name", (2, 11, 2, 12), "e", ("Store",)),
                        ("Name", (2, 16, 2, 17), "i", ("Load",)),
                        [
                            (
                                "Expr",
                                (2, 19, 2, 20),
                                ("Constant", (2, 19, 2, 20), 1, None),
                            )
                        ],
                        [("Expr", (3, 7, 3, 8), ("Constant", (3, 7, 3, 8), 2, None))],
                        None,
                    )
                ],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "AsyncFunctionDef",
                (1, 0, 2, 21),
                "f",
                ("arguments", [], [], None, [], [], None, []),
                [
                    (
                        "AsyncWith",
                        (2, 1, 2, 21),
                        [
                            (
                                "withitem",
                                ("Name", (2, 12, 2, 13), "a", ("Load",)),
                                ("Name", (2, 17, 2, 18), "b", ("Store",)),
                            )
                        ],
                        [
                            (
                                "Expr",
                                (2, 20, 2, 21),
                                ("Constant", (2, 20, 2, 21), 1, None),
                            )
                        ],
                        None,
                    )
                ],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Expr",
                (1, 0, 1, 14),
                (
                    "Dict",
                    (1, 0, 1, 14),
                    [None, ("Constant", (1, 10, 1, 11), 2, None)],
                    [
                        (
                            "Dict",
                            (1, 3, 1, 8),
                            [("Constant", (1, 4, 1, 5), 1, None)],
                            [("Constant", (1, 6, 1, 7), 2, None)],
                        ),
                        ("Constant", (1, 12, 1, 13), 3, None),
                    ],
                ),
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Expr",
                (1, 0, 1, 12),
                (
                    "Set",
                    (1, 0, 1, 12),
                    [
                        (
                            "Starred",
                            (1, 1, 1, 8),
                            (
                                "Set",
                                (1, 2, 1, 8),
                                [
                                    ("Constant", (1, 3, 1, 4), 1, None),
                                    ("Constant", (1, 6, 1, 7), 2, None),
                                ],
                            ),
                            ("Load",),
                        ),
                        ("Constant", (1, 10, 1, 11), 3, None),
                    ],
                ),
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "AsyncFunctionDef",
                (1, 0, 2, 21),
                "f",
                ("arguments", [], [], None, [], [], None, []),
                [
                    (
                        "Expr",
                        (2, 1, 2, 21),
                        (
                            "ListComp",
                            (2, 1, 2, 21),
                            ("Name", (2, 2, 2, 3), "i", ("Load",)),
                            [
                                (
                                    "comprehension",
                                    ("Name", (2, 14, 2, 15), "b", ("Store",)),
                                    ("Name", (2, 19, 2, 20), "c", ("Load",)),
                                    [],
                                    1,
                                )
                            ],
                        ),
                    )
                ],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (4, 0, 4, 13),
                "f",
                ("arguments", [], [], None, [], [], None, []),
                [("Pass", (4, 9, 4, 13))],
                [
                    ("Name", (1, 1, 1, 6), "deco1", ("Load",)),
                    (
                        "Call",
                        (2, 1, 2, 8),
                        ("Name", (2, 1, 2, 6), "deco2", ("Load",)),
                        [],
                        [],
                    ),
                    (
                        "Call",
                        (3, 1, 3, 9),
                        ("Name", (3, 1, 3, 6), "deco3", ("Load",)),
                        [("Constant", (3, 7, 3, 8), 1, None)],
                        [],
                    ),
                ],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "AsyncFunctionDef",
                (4, 0, 4, 19),
                "f",
                ("arguments", [], [], None, [], [], None, []),
                [("Pass", (4, 15, 4, 19))],
                [
                    ("Name", (1, 1, 1, 6), "deco1", ("Load",)),
                    (
                        "Call",
                        (2, 1, 2, 8),
                        ("Name", (2, 1, 2, 6), "deco2", ("Load",)),
                        [],
                        [],
                    ),
                    (
                        "Call",
                        (3, 1, 3, 9),
                        ("Name", (3, 1, 3, 6), "deco3", ("Load",)),
                        [("Constant", (3, 7, 3, 8), 1, None)],
                        [],
                    ),
                ],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "ClassDef",
                (4, 0, 4, 13),
                "C",
                [],
                [],
                [("Pass", (4, 9, 4, 13))],
                [
                    ("Name", (1, 1, 1, 6), "deco1", ("Load",)),
                    (
                        "Call",
                        (2, 1, 2, 8),
                        ("Name", (2, 1, 2, 6), "deco2", ("Load",)),
                        [],
                        [],
                    ),
                    (
                        "Call",
                        (3, 1, 3, 9),
                        ("Name", (3, 1, 3, 6), "deco3", ("Load",)),
                        [("Constant", (3, 7, 3, 8), 1, None)],
                        [],
                    ),
                ],
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (2, 0, 2, 13),
                "f",
                ("arguments", [], [], None, [], [], None, []),
                [("Pass", (2, 9, 2, 13))],
                [
                    (
                        "Call",
                        (1, 1, 1, 19),
                        ("Name", (1, 1, 1, 5), "deco", ("Load",)),
                        [
                            (
                                "GeneratorExp",
                                (1, 5, 1, 19),
                                ("Name", (1, 6, 1, 7), "a", ("Load",)),
                                [
                                    (
                                        "comprehension",
                                        ("Name", (1, 12, 1, 13), "a", ("Store",)),
                                        ("Name", (1, 17, 1, 18), "b", ("Load",)),
                                        [],
                                        0,
                                    )
                                ],
                            )
                        ],
                        [],
                    )
                ],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (2, 0, 2, 13),
                "f",
                ("arguments", [], [], None, [], [], None, []),
                [("Pass", (2, 9, 2, 13))],
                [
                    (
                        "Attribute",
                        (1, 1, 1, 6),
                        (
                            "Attribute",
                            (1, 1, 1, 4),
                            ("Name", (1, 1, 1, 2), "a", ("Load",)),
                            "b",
                            ("Load",),
                        ),
                        "c",
                        ("Load",),
                    )
                ],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "Expr",
                (1, 0, 1, 8),
                (
                    "NamedExpr",
                    (1, 1, 1, 7),
                    ("Name", (1, 1, 1, 2), "a", ("Store",)),
                    ("Constant", (1, 6, 1, 7), 1, None),
                ),
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 18),
                "f",
                (
                    "arguments",
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    [],
                    None,
                    [],
                    [],
                    None,
                    [],
                ),
                [("Pass", (1, 14, 1, 18))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 26),
                "f",
                (
                    "arguments",
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    [
                        ("arg", (1, 12, 1, 13), "c", None, None),
                        ("arg", (1, 15, 1, 16), "d", None, None),
                        ("arg", (1, 18, 1, 19), "e", None, None),
                    ],
                    None,
                    [],
                    [],
                    None,
                    [],
                ),
                [("Pass", (1, 22, 1, 26))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 29),
                "f",
                (
                    "arguments",
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    [("arg", (1, 12, 1, 13), "c", None, None)],
                    None,
                    [
                        ("arg", (1, 18, 1, 19), "d", None, None),
                        ("arg", (1, 21, 1, 22), "e", None, None),
                    ],
                    [None, None],
                    None,
                    [],
                ),
                [("Pass", (1, 25, 1, 29))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 39),
                "f",
                (
                    "arguments",
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    [("arg", (1, 12, 1, 13), "c", None, None)],
                    None,
                    [
                        ("arg", (1, 18, 1, 19), "d", None, None),
                        ("arg", (1, 21, 1, 22), "e", None, None),
                    ],
                    [None, None],
                    ("arg", (1, 26, 1, 32), "kwargs", None, None),
                    [],
                ),
                [("Pass", (1, 35, 1, 39))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 20),
                "f",
                (
                    "arguments",
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    [],
                    None,
                    [],
                    [],
                    None,
                    [("Constant", (1, 8, 1, 9), 1, None)],
                ),
                [("Pass", (1, 16, 1, 20))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 29),
                "f",
                (
                    "arguments",
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    [
                        ("arg", (1, 14, 1, 15), "b", None, None),
                        ("arg", (1, 19, 1, 20), "c", None, None),
                    ],
                    None,
                    [],
                    [],
                    None,
                    [
                        ("Constant", (1, 8, 1, 9), 1, None),
                        ("Constant", (1, 16, 1, 17), 2, None),
                        ("Constant", (1, 21, 1, 22), 4, None),
                    ],
                ),
                [("Pass", (1, 25, 1, 29))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 32),
                "f",
                (
                    "arguments",
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    [("arg", (1, 14, 1, 15), "b", None, None)],
                    None,
                    [("arg", (1, 22, 1, 23), "c", None, None)],
                    [("Constant", (1, 24, 1, 25), 4, None)],
                    None,
                    [
                        ("Constant", (1, 8, 1, 9), 1, None),
                        ("Constant", (1, 16, 1, 17), 2, None),
                    ],
                ),
                [("Pass", (1, 28, 1, 32))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 30),
                "f",
                (
                    "arguments",
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    [("arg", (1, 14, 1, 15), "b", None, None)],
                    None,
                    [("arg", (1, 22, 1, 23), "c", None, None)],
                    [None],
                    None,
                    [
                        ("Constant", (1, 8, 1, 9), 1, None),
                        ("Constant", (1, 16, 1, 17), 2, None),
                    ],
                ),
                [("Pass", (1, 26, 1, 30))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 42),
                "f",
                (
                    "arguments",
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    [("arg", (1, 14, 1, 15), "b", None, None)],
                    None,
                    [("arg", (1, 22, 1, 23), "c", None, None)],
                    [("Constant", (1, 24, 1, 25), 4, None)],
                    ("arg", (1, 29, 1, 35), "kwargs", None, None),
                    [
                        ("Constant", (1, 8, 1, 9), 1, None),
                        ("Constant", (1, 16, 1, 17), 2, None),
                    ],
                ),
                [("Pass", (1, 38, 1, 42))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
    (
        "Module",
        [
            (
                "FunctionDef",
                (1, 0, 1, 40),
                "f",
                (
                    "arguments",
                    [("arg", (1, 6, 1, 7), "a", None, None)],
                    [("arg", (1, 14, 1, 15), "b", None, None)],
                    None,
                    [("arg", (1, 22, 1, 23), "c", None, None)],
                    [None],
                    ("arg", (1, 27, 1, 33), "kwargs", None, None),
                    [
                        ("Constant", (1, 8, 1, 9), 1, None),
                        ("Constant", (1, 16, 1, 17), 2, None),
                    ],
                ),
                [("Pass", (1, 36, 1, 40))],
                [],
                None,
                None,
            )
        ],
        [],
    ),
]
single_results = [
    (
        "Interactive",
        [
            (
                "Expr",
                (1, 0, 1, 3),
                (
                    "BinOp",
                    (1, 0, 1, 3),
                    ("Constant", (1, 0, 1, 1), 1, None),
                    ("Add",),
                    ("Constant", (1, 2, 1, 3), 2, None),
                ),
            )
        ],
    ),
]
eval_results = [
    ("Expression", ("Constant", (1, 0, 1, 4), None, None)),
    (
        "Expression",
        (
            "BoolOp",
            (1, 0, 1, 7),
            ("And",),
            [
                ("Name", (1, 0, 1, 1), "a", ("Load",)),
                ("Name", (1, 6, 1, 7), "b", ("Load",)),
            ],
        ),
    ),
    (
        "Expression",
        (
            "BinOp",
            (1, 0, 1, 5),
            ("Name", (1, 0, 1, 1), "a", ("Load",)),
            ("Add",),
            ("Name", (1, 4, 1, 5), "b", ("Load",)),
        ),
    ),
    (
        "Expression",
        ("UnaryOp", (1, 0, 1, 5), ("Not",), ("Name", (1, 4, 1, 5), "v", ("Load",))),
    ),
    (
        "Expression",
        (
            "Lambda",
            (1, 0, 1, 11),
            ("arguments", [], [], None, [], [], None, []),
            ("Constant", (1, 7, 1, 11), None, None),
        ),
    ),
    (
        "Expression",
        (
            "Dict",
            (1, 0, 1, 7),
            [("Constant", (1, 2, 1, 3), 1, None)],
            [("Constant", (1, 4, 1, 5), 2, None)],
        ),
    ),
    ("Expression", ("Dict", (1, 0, 1, 2), [], [])),
    ("Expression", ("Set", (1, 0, 1, 7), [("Constant", (1, 1, 1, 5), None, None)])),
    (
        "Expression",
        (
            "Dict",
            (1, 0, 5, 6),
            [("Constant", (2, 6, 2, 7), 1, None)],
            [("Constant", (4, 10, 4, 11), 2, None)],
        ),
    ),
    (
        "Expression",
        (
            "ListComp",
            (1, 0, 1, 19),
            ("Name", (1, 1, 1, 2), "a", ("Load",)),
            [
                (
                    "comprehension",
                    ("Name", (1, 7, 1, 8), "b", ("Store",)),
                    ("Name", (1, 12, 1, 13), "c", ("Load",)),
                    [("Name", (1, 17, 1, 18), "d", ("Load",))],
                    0,
                )
            ],
        ),
    ),
    (
        "Expression",
        (
            "GeneratorExp",
            (1, 0, 1, 19),
            ("Name", (1, 1, 1, 2), "a", ("Load",)),
            [
                (
                    "comprehension",
                    ("Name", (1, 7, 1, 8), "b", ("Store",)),
                    ("Name", (1, 12, 1, 13), "c", ("Load",)),
                    [("Name", (1, 17, 1, 18), "d", ("Load",))],
                    0,
                )
            ],
        ),
    ),
    (
        "Expression",
        (
            "ListComp",
            (1, 0, 1, 20),
            (
                "Tuple",
                (1, 1, 1, 6),
                [
                    ("Name", (1, 2, 1, 3), "a", ("Load",)),
                    ("Name", (1, 4, 1, 5), "b", ("Load",)),
                ],
                ("Load",),
            ),
            [
                (
                    "comprehension",
                    (
                        "Tuple",
                        (1, 11, 1, 14),
                        [
                            ("Name", (1, 11, 1, 12), "a", ("Store",)),
                            ("Name", (1, 13, 1, 14), "b", ("Store",)),
                        ],
                        ("Store",),
                    ),
                    ("Name", (1, 18, 1, 19), "c", ("Load",)),
                    [],
                    0,
                )
            ],
        ),
    ),
    (
        "Expression",
        (
            "ListComp",
            (1, 0, 1, 22),
            (
                "Tuple",
                (1, 1, 1, 6),
                [
                    ("Name", (1, 2, 1, 3), "a", ("Load",)),
                    ("Name", (1, 4, 1, 5), "b", ("Load",)),
                ],
                ("Load",),
            ),
            [
                (
                    "comprehension",
                    (
                        "Tuple",
                        (1, 11, 1, 16),
                        [
                            ("Name", (1, 12, 1, 13), "a", ("Store",)),
                            ("Name", (1, 14, 1, 15), "b", ("Store",)),
                        ],
                        ("Store",),
                    ),
                    ("Name", (1, 20, 1, 21), "c", ("Load",)),
                    [],
                    0,
                )
            ],
        ),
    ),
    (
        "Expression",
        (
            "ListComp",
            (1, 0, 1, 22),
            (
                "Tuple",
                (1, 1, 1, 6),
                [
                    ("Name", (1, 2, 1, 3), "a", ("Load",)),
                    ("Name", (1, 4, 1, 5), "b", ("Load",)),
                ],
                ("Load",),
            ),
            [
                (
                    "comprehension",
                    (
                        "List",
                        (1, 11, 1, 16),
                        [
                            ("Name", (1, 12, 1, 13), "a", ("Store",)),
                            ("Name", (1, 14, 1, 15), "b", ("Store",)),
                        ],
                        ("Store",),
                    ),
                    ("Name", (1, 20, 1, 21), "c", ("Load",)),
                    [],
                    0,
                )
            ],
        ),
    ),
    (
        "Expression",
        (
            "SetComp",
            (1, 0, 1, 20),
            (
                "Tuple",
                (1, 1, 1, 6),
                [
                    ("Name", (1, 2, 1, 3), "a", ("Load",)),
                    ("Name", (1, 4, 1, 5), "b", ("Load",)),
                ],
                ("Load",),
            ),
            [
                (
                    "comprehension",
                    (
                        "Tuple",
                        (1, 11, 1, 14),
                        [
                            ("Name", (1, 11, 1, 12), "a", ("Store",)),
                            ("Name", (1, 13, 1, 14), "b", ("Store",)),
                        ],
                        ("Store",),
                    ),
                    ("Name", (1, 18, 1, 19), "c", ("Load",)),
                    [],
                    0,
                )
            ],
        ),
    ),
    (
        "Expression",
        (
            "SetComp",
            (1, 0, 1, 22),
            (
                "Tuple",
                (1, 1, 1, 6),
                [
                    ("Name", (1, 2, 1, 3), "a", ("Load",)),
                    ("Name", (1, 4, 1, 5), "b", ("Load",)),
                ],
                ("Load",),
            ),
            [
                (
                    "comprehension",
                    (
                        "Tuple",
                        (1, 11, 1, 16),
                        [
                            ("Name", (1, 12, 1, 13), "a", ("Store",)),
                            ("Name", (1, 14, 1, 15), "b", ("Store",)),
                        ],
                        ("Store",),
                    ),
                    ("Name", (1, 20, 1, 21), "c", ("Load",)),
                    [],
                    0,
                )
            ],
        ),
    ),
    (
        "Expression",
        (
            "SetComp",
            (1, 0, 1, 22),
            (
                "Tuple",
                (1, 1, 1, 6),
                [
                    ("Name", (1, 2, 1, 3), "a", ("Load",)),
                    ("Name", (1, 4, 1, 5), "b", ("Load",)),
                ],
                ("Load",),
            ),
            [
                (
                    "comprehension",
                    (
                        "List",
                        (1, 11, 1, 16),
                        [
                            ("Name", (1, 12, 1, 13), "a", ("Store",)),
                            ("Name", (1, 14, 1, 15), "b", ("Store",)),
                        ],
                        ("Store",),
                    ),
                    ("Name", (1, 20, 1, 21), "c", ("Load",)),
                    [],
                    0,
                )
            ],
        ),
    ),
    (
        "Expression",
        (
            "GeneratorExp",
            (1, 0, 1, 20),
            (
                "Tuple",
                (1, 1, 1, 6),
                [
                    ("Name", (1, 2, 1, 3), "a", ("Load",)),
                    ("Name", (1, 4, 1, 5), "b", ("Load",)),
                ],
                ("Load",),
            ),
            [
                (
                    "comprehension",
                    (
                        "Tuple",
                        (1, 11, 1, 14),
                        [
                            ("Name", (1, 11, 1, 12), "a", ("Store",)),
                            ("Name", (1, 13, 1, 14), "b", ("Store",)),
                        ],
                        ("Store",),
                    ),
                    ("Name", (1, 18, 1, 19), "c", ("Load",)),
                    [],
                    0,
                )
            ],
        ),
    ),
    (
        "Expression",
        (
            "GeneratorExp",
            (1, 0, 1, 22),
            (
                "Tuple",
                (1, 1, 1, 6),
                [
                    ("Name", (1, 2, 1, 3), "a", ("Load",)),
                    ("Name", (1, 4, 1, 5), "b", ("Load",)),
                ],
                ("Load",),
            ),
            [
                (
                    "comprehension",
                    (
                        "Tuple",
                        (1, 11, 1, 16),
                        [
                            ("Name", (1, 12, 1, 13), "a", ("Store",)),
                            ("Name", (1, 14, 1, 15), "b", ("Store",)),
                        ],
                        ("Store",),
                    ),
                    ("Name", (1, 20, 1, 21), "c", ("Load",)),
                    [],
                    0,
                )
            ],
        ),
    ),
    (
        "Expression",
        (
            "GeneratorExp",
            (1, 0, 1, 22),
            (
                "Tuple",
                (1, 1, 1, 6),
                [
                    ("Name", (1, 2, 1, 3), "a", ("Load",)),
                    ("Name", (1, 4, 1, 5), "b", ("Load",)),
                ],
                ("Load",),
            ),
            [
                (
                    "comprehension",
                    (
                        "List",
                        (1, 11, 1, 16),
                        [
                            ("Name", (1, 12, 1, 13), "a", ("Store",)),
                            ("Name", (1, 14, 1, 15), "b", ("Store",)),
                        ],
                        ("Store",),
                    ),
                    ("Name", (1, 20, 1, 21), "c", ("Load",)),
                    [],
                    0,
                )
            ],
        ),
    ),
    (
        "Expression",
        (
            "Compare",
            (1, 0, 1, 9),
            ("Constant", (1, 0, 1, 1), 1, None),
            [("Lt",), ("Lt",)],
            [("Constant", (1, 4, 1, 5), 2, None), ("Constant", (1, 8, 1, 9), 3, None)],
        ),
    ),
    (
        "Expression",
        (
            "Call",
            (1, 0, 1, 17),
            ("Name", (1, 0, 1, 1), "f", ("Load",)),
            [
                ("Constant", (1, 2, 1, 3), 1, None),
                ("Constant", (1, 4, 1, 5), 2, None),
                (
                    "Starred",
                    (1, 10, 1, 12),
                    ("Name", (1, 11, 1, 12), "d", ("Load",)),
                    ("Load",),
                ),
            ],
            [
                ("keyword", (1, 6, 1, 9), "c", ("Constant", (1, 8, 1, 9), 3, None)),
                (
                    "keyword",
                    (1, 13, 1, 16),
                    None,
                    ("Name", (1, 15, 1, 16), "e", ("Load",)),
                ),
            ],
        ),
    ),
    (
        "Expression",
        (
            "Call",
            (1, 0, 1, 10),
            ("Name", (1, 0, 1, 1), "f", ("Load",)),
            [
                (
                    "Starred",
                    (1, 2, 1, 9),
                    (
                        "List",
                        (1, 3, 1, 9),
                        [
                            ("Constant", (1, 4, 1, 5), 0, None),
                            ("Constant", (1, 7, 1, 8), 1, None),
                        ],
                        ("Load",),
                    ),
                    ("Load",),
                )
            ],
            [],
        ),
    ),
    (
        "Expression",
        (
            "Call",
            (1, 0, 1, 15),
            ("Name", (1, 0, 1, 1), "f", ("Load",)),
            [
                (
                    "GeneratorExp",
                    (1, 1, 1, 15),
                    ("Name", (1, 2, 1, 3), "a", ("Load",)),
                    [
                        (
                            "comprehension",
                            ("Name", (1, 8, 1, 9), "a", ("Store",)),
                            ("Name", (1, 13, 1, 14), "b", ("Load",)),
                            [],
                            0,
                        )
                    ],
                )
            ],
            [],
        ),
    ),
    ("Expression", ("Constant", (1, 0, 1, 2), 10, None)),
    ("Expression", ("Constant", (1, 0, 1, 8), "string", None)),
    (
        "Expression",
        (
            "Attribute",
            (1, 0, 1, 3),
            ("Name", (1, 0, 1, 1), "a", ("Load",)),
            "b",
            ("Load",),
        ),
    ),
    (
        "Expression",
        (
            "Subscript",
            (1, 0, 1, 6),
            ("Name", (1, 0, 1, 1), "a", ("Load",)),
            (
                "Slice",
                (1, 2, 1, 5),
                ("Name", (1, 2, 1, 3), "b", ("Load",)),
                ("Name", (1, 4, 1, 5), "c", ("Load",)),
                None,
            ),
            ("Load",),
        ),
    ),
    ("Expression", ("Name", (1, 0, 1, 1), "v", ("Load",))),
    (
        "Expression",
        (
            "List",
            (1, 0, 1, 7),
            [
                ("Constant", (1, 1, 1, 2), 1, None),
                ("Constant", (1, 3, 1, 4), 2, None),
                ("Constant", (1, 5, 1, 6), 3, None),
            ],
            ("Load",),
        ),
    ),
    ("Expression", ("List", (1, 0, 1, 2), [], ("Load",))),
    (
        "Expression",
        (
            "Tuple",
            (1, 0, 1, 5),
            [
                ("Constant", (1, 0, 1, 1), 1, None),
                ("Constant", (1, 2, 1, 3), 2, None),
                ("Constant", (1, 4, 1, 5), 3, None),
            ],
            ("Load",),
        ),
    ),
    (
        "Expression",
        (
            "Tuple",
            (1, 0, 1, 7),
            [
                ("Constant", (1, 1, 1, 2), 1, None),
                ("Constant", (1, 3, 1, 4), 2, None),
                ("Constant", (1, 5, 1, 6), 3, None),
            ],
            ("Load",),
        ),
    ),
    ("Expression", ("Tuple", (1, 0, 1, 2), [], ("Load",))),
    (
        "Expression",
        (
            "Call",
            (1, 0, 1, 17),
            (
                "Attribute",
                (1, 0, 1, 7),
                (
                    "Attribute",
                    (1, 0, 1, 5),
                    (
                        "Attribute",
                        (1, 0, 1, 3),
                        ("Name", (1, 0, 1, 1), "a", ("Load",)),
                        "b",
                        ("Load",),
                    ),
                    "c",
                    ("Load",),
                ),
                "d",
                ("Load",),
            ),
            [
                (
                    "Subscript",
                    (1, 8, 1, 16),
                    (
                        "Attribute",
                        (1, 8, 1, 11),
                        ("Name", (1, 8, 1, 9), "a", ("Load",)),
                        "b",
                        ("Load",),
                    ),
                    (
                        "Slice",
                        (1, 12, 1, 15),
                        ("Constant", (1, 12, 1, 13), 1, None),
                        ("Constant", (1, 14, 1, 15), 2, None),
                        None,
                    ),
                    ("Load",),
                )
            ],
            [],
        ),
    ),
]
