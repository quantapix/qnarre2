import ast
import dis
import os
import sys
import pytest
import warnings
import weakref
from textwrap import dedent

from test import support


class ASTHelpers_Test:
    maxDiff = None

    def test_parse(self):
        a = ast.parse("foo(1 + 1)")
        b = compile("foo(1 + 1)", "<unknown>", "exec", ast.PyCF_ONLY_AST)
        assert ast.dump(a) == ast.dump(b)

    def test_parse_in_error(self):
        try:
            1 / 0
        except Exception:
            with pytest.raises(SyntaxError) as e:
                ast.literal_eval(r"'\U'")
            self.assertIsNotNone(e.exception.__context__)

    def test_dump(self):
        node = ast.parse('spam(eggs, "and cheese")')
        assert ast.dump(node) == (
            "Module(body=[Expr(value=Call(func=Name(id='spam', ctx=Load()), "
            "args=[Name(id='eggs', ctx=Load()), Constant(value='and cheese')], "
            "keywords=[]))], type_ignores=[])"
        )

        assert ast.dump(node, annotate_fields=False) == (
            "Module([Expr(Call(Name('spam', Load()), [Name('eggs', Load()), "
            "Constant('and cheese')], []))], [])"
        )

        assert ast.dump(node, include_attributes=True) == (
            "Module(body=[Expr(value=Call(func=Name(id='spam', ctx=Load(), "
            "lineno=1, col_offset=0, end_lineno=1, end_col_offset=4), "
            "args=[Name(id='eggs', ctx=Load(), lineno=1, col_offset=5, "
            "end_lineno=1, end_col_offset=9), Constant(value='and cheese', "
            "lineno=1, col_offset=11, end_lineno=1, end_col_offset=23)], keywords=[], "
            "lineno=1, col_offset=0, end_lineno=1, end_col_offset=24), "
            "lineno=1, col_offset=0, end_lineno=1, end_col_offset=24)], type_ignores=[])",
        )

    def test_dump_indent(self):
        node = ast.parse('spam(eggs, "and cheese")')
        assert (
            ast.dump(node, indent=3)
            == """\
Module(
   body=[
      Expr(
         value=Call(
            func=Name(id='spam', ctx=Load()),
            args=[
               Name(id='eggs', ctx=Load()),
               Constant(value='and cheese')],
            keywords=[]))],
   type_ignores=[])"""
        )

        assert (
            ast.dump(node, annotate_fields=False, indent="\t")
            == """\
Module(
\t[
\t\tExpr(
\t\t\tCall(
\t\t\t\tName('spam', Load()),
\t\t\t\t[
\t\t\t\t\tName('eggs', Load()),
\t\t\t\t\tConstant('and cheese')],
\t\t\t\t[]))],
\t[])"""
        )

        assert (
            ast.dump(node, include_attributes=True, indent=3)
            == """\
Module(
   body=[
      Expr(
         value=Call(
            func=Name(
               id='spam',
               ctx=Load(),
               lineno=1,
               col_offset=0,
               end_lineno=1,
               end_col_offset=4),
            args=[
               Name(
                  id='eggs',
                  ctx=Load(),
                  lineno=1,
                  col_offset=5,
                  end_lineno=1,
                  end_col_offset=9),
               Constant(
                  value='and cheese',
                  lineno=1,
                  col_offset=11,
                  end_lineno=1,
                  end_col_offset=23)],
            keywords=[],
            lineno=1,
            col_offset=0,
            end_lineno=1,
            end_col_offset=24),
         lineno=1,
         col_offset=0,
         end_lineno=1,
         end_col_offset=24)],
   type_ignores=[])"""
        )

    def test_dump_incomplete(self):
        node = ast.Raise(lineno=3, col_offset=4)
        assert ast.dump(node) == "Raise()"
        assert (
            ast.dump(node, include_attributes=True) == "Raise(lineno=3, col_offset=4)"
        )

        node = ast.Raise(exc=ast.Name(id="e", ctx=ast.Load()), lineno=3, col_offset=4)
        assert ast.dump(node), "Raise(exc=Name(id='e', ctx=Load()))"
        assert ast.dump(node, annotate_fields=False) == ("Raise(Name('e', Load()))")
        assert ast.dump(node, include_attributes=True) == (
            "Raise(exc=Name(id='e', ctx=Load()), lineno=3, col_offset=4)",
        )
        assert ast.dump(node, annotate_fields=False, include_attributes=True) == (
            "Raise(Name('e', Load()), lineno=3, col_offset=4)",
        )
        node = ast.Raise(cause=ast.Name(id="e", ctx=ast.Load()))
        assert ast.dump(node) == "Raise(cause=Name(id='e', ctx=Load()))"
        assert ast.dump(node, annotate_fields=False) == "Raise(cause=Name('e', Load()))"

    def test_copy_location(self):
        src = ast.parse("1 + 1", mode="eval")
        src.body.right = ast.copy_location(ast.Num(2), src.body.right)
        assert ast.dump(src, include_attributes=True) == (
            "Expression(body=BinOp(left=Constant(value=1, lineno=1, col_offset=0, "
            "end_lineno=1, end_col_offset=1), op=Add(), right=Constant(value=2, "
            "lineno=1, col_offset=4, end_lineno=1, end_col_offset=5), lineno=1, "
            "col_offset=0, end_lineno=1, end_col_offset=5))",
        )

    def test_fix_missing_locations(self):
        src = ast.parse('write("spam")')
        src.body.append(
            ast.Expr(ast.Call(ast.Name("spam", ast.Load()), [ast.Str("eggs")], []))
        )
        assert src == ast.fix_missing_locations(src)
        self.maxDiff = None
        assert ast.dump(src, include_attributes=True) == (
            "Module(body=[Expr(value=Call(func=Name(id='write', ctx=Load(), "
            "lineno=1, col_offset=0, end_lineno=1, end_col_offset=5), "
            "args=[Constant(value='spam', lineno=1, col_offset=6, end_lineno=1, "
            "end_col_offset=12)], keywords=[], lineno=1, col_offset=0, end_lineno=1, "
            "end_col_offset=13), lineno=1, col_offset=0, end_lineno=1, "
            "end_col_offset=13), Expr(value=Call(func=Name(id='spam', ctx=Load(), "
            "lineno=1, col_offset=0, end_lineno=1, end_col_offset=0), "
            "args=[Constant(value='eggs', lineno=1, col_offset=0, end_lineno=1, "
            "end_col_offset=0)], keywords=[], lineno=1, col_offset=0, end_lineno=1, "
            "end_col_offset=0), lineno=1, col_offset=0, end_lineno=1, end_col_offset=0)], "
            "type_ignores=[])",
        )

    def test_increment_lineno(self):
        src = ast.parse("1 + 1", mode="eval")
        assert ast.increment_lineno(src, n=3) == src
        assert ast.dump(src, include_attributes=True) == (
            "Expression(body=BinOp(left=Constant(value=1, lineno=4, col_offset=0, "
            "end_lineno=4, end_col_offset=1), op=Add(), right=Constant(value=1, "
            "lineno=4, col_offset=4, end_lineno=4, end_col_offset=5), lineno=4, "
            "col_offset=0, end_lineno=4, end_col_offset=5))",
        )
        # issue10869: do not increment lineno of root twice
        src = ast.parse("1 + 1", mode="eval")
        assert ast.increment_lineno(src.body, n=3) == src.body
        assert ast.dump(src, include_attributes=True) == (
            "Expression(body=BinOp(left=Constant(value=1, lineno=4, col_offset=0, "
            "end_lineno=4, end_col_offset=1), op=Add(), right=Constant(value=1, "
            "lineno=4, col_offset=4, end_lineno=4, end_col_offset=5), lineno=4, "
            "col_offset=0, end_lineno=4, end_col_offset=5))",
        )

    def test_iter_fields(self):
        node = ast.parse("foo()", mode="eval")
        d = dict(ast.iter_fields(node.body))
        assert d.pop("func").id == "foo"
        assert d == {"keywords": [], "args": []}

    def test_iter_child_nodes(self):
        node = ast.parse("spam(23, 42, eggs='leek')", mode="eval")
        assert len(list(ast.iter_child_nodes(node.body))) == 4
        iterator = ast.iter_child_nodes(node.body)
        assert next(iterator).id == "spam"
        assert next(iterator).value == 23
        assert next(iterator).value == 42
        assert ast.dump(next(iterator)) == (
            "keyword(arg='eggs', value=Constant(value='leek'))",
        )

    def test_get_docstring(self):
        node = ast.parse('"""line one\n  line two"""')
        assert ast.get_docstring(node) == "line one\nline two"

        node = ast.parse('class foo:\n  """line one\n  line two"""')
        assert ast.get_docstring(node.body[0]) == "line one\nline two"

        node = ast.parse('def foo():\n  """line one\n  line two"""')
        assert ast.get_docstring(node.body[0]) == "line one\nline two"

        node = ast.parse('async def foo():\n  """spam\n  ham"""')
        assert ast.get_docstring(node.body[0]) == "spam\nham"

    def test_get_docstring_none(self):
        assert ast.get_docstring(ast.parse("")) is None
        node = ast.parse('x = "not docstring"')
        assert ast.get_docstring(node) is None
        node = ast.parse("def foo():\n  pass")
        assert ast.get_docstring(node) is None

        node = ast.parse("class foo:\n  pass")
        assert ast.get_docstring(node.body[0]) is None
        node = ast.parse('class foo:\n  x = "not docstring"')
        assert ast.get_docstring(node.body[0]) is None
        node = ast.parse("class foo:\n  def bar(self): pass")
        assert ast.get_docstring(node.body[0]) is None

        node = ast.parse("def foo():\n  pass")
        assert ast.get_docstring(node.body[0]) is None
        node = ast.parse('def foo():\n  x = "not docstring"')
        assert ast.get_docstring(node.body[0]) is None

        node = ast.parse("async def foo():\n  pass")
        assert ast.get_docstring(node.body[0]) is None
        node = ast.parse('async def foo():\n  x = "not docstring"')
        assert ast.get_docstring(node.body[0]) is None

    def test_multi_line_docstring_col_offset_and_lineno_issue16806(self):
        node = ast.parse(
            '"""line one\nline two"""\n\n'
            'def foo():\n  """line one\n  line two"""\n\n'
            '  def bar():\n    """line one\n    line two"""\n'
            '  """line one\n  line two"""\n'
            '"""line one\nline two"""\n\n'
        )
        assert node.body[0].col_offset == 0
        assert node.body[0].lineno == 1
        assert node.body[1].body[0].col_offset == 2
        assert node.body[1].body[0].lineno == 5
        assert node.body[1].body[1].body[0].col_offset == 4
        assert node.body[1].body[1].body[0].lineno == 9
        assert node.body[1].body[2].col_offset == 2
        assert node.body[1].body[2].lineno == 11
        assert node.body[2].col_offset == 0
        assert node.body[2].lineno == 13

    def test_elif_stmt_start_position(self):
        node = ast.parse("if a:\n    pass\nelif b:\n    pass\n")
        elif_stmt = node.body[0].orelse[0]
        assert elif_stmt.lineno == 3
        assert elif_stmt.col_offset == 0

    def test_elif_stmt_start_position_with_else(self):
        node = ast.parse("if a:\n    pass\nelif b:\n    pass\nelse:\n    pass\n")
        elif_stmt = node.body[0].orelse[0]
        assert elif_stmt.lineno == 3
        assert elif_stmt.col_offset == 0

    def test_starred_expr_end_position_within_call(self):
        node = ast.parse("f(*[0, 1])")
        starred_expr = node.body[0].value.args[0]
        assert starred_expr.end_lineno == 1
        assert starred_expr.end_col_offset == 9

    def test_literal_eval(self):
        assert ast.literal_eval("[1, 2, 3]") == [1, 2, 3]
        assert ast.literal_eval('{"foo": 42}') == {"foo": 42}
        assert ast.literal_eval("(True, False, None)") == (True, False, None)
        assert ast.literal_eval("{1, 2, 3}") == {1, 2, 3}
        assert ast.literal_eval('b"hi"') == b"hi"
        assert ast.literal_eval("set()") == set()
        pytest.raises(ValueError, ast.literal_eval, "foo()")
        assert ast.literal_eval("6") == 6
        assert ast.literal_eval("+6") == 6
        assert ast.literal_eval("-6") == -6
        assert ast.literal_eval("3.25") == 3.25
        assert ast.literal_eval("+3.25") == 3.25
        assert ast.literal_eval("-3.25") == -3.25
        assert repr(ast.literal_eval("-0.0")) == "-0.0"
        pytest.raises(ValueError, ast.literal_eval, "++6")
        pytest.raises(ValueError, ast.literal_eval, "+True")
        pytest.raises(ValueError, ast.literal_eval, "2+3")

    def test_literal_eval_complex(self):
        # Issue #4907
        assert ast.literal_eval("6j") == 6j
        assert ast.literal_eval("-6j") == -6j
        assert ast.literal_eval("6.75j") == 6.75j
        assert ast.literal_eval("-6.75j") == -6.75j
        assert ast.literal_eval("3+6j") == 3 + 6j
        assert ast.literal_eval("-3+6j") == -3 + 6j
        assert ast.literal_eval("3-6j") == 3 - 6j
        assert ast.literal_eval("-3-6j") == -3 - 6j
        assert ast.literal_eval("3.25+6.75j") == 3.25 + 6.75j
        assert ast.literal_eval("-3.25+6.75j") == -3.25 + 6.75j
        assert ast.literal_eval("3.25-6.75j") == 3.25 - 6.75j
        assert ast.literal_eval("-3.25-6.75j") == -3.25 - 6.75j
        assert ast.literal_eval("(3+6j)") == 3 + 6j
        pytest.raises(ValueError, ast.literal_eval, "-6j+3")
        pytest.raises(ValueError, ast.literal_eval, "-6j+3j")
        pytest.raises(ValueError, ast.literal_eval, "3+-6j")
        pytest.raises(ValueError, ast.literal_eval, "3+(0+6j)")
        pytest.raises(ValueError, ast.literal_eval, "-(3+6j)")

    def test_bad_integer(self):
        # issue13436: Bad error message with invalid numeric values
        body = [
            ast.ImportFrom(
                module="time",
                names=[ast.alias(name="sleep")],
                level=None,
                lineno=None,
                col_offset=None,
            )
        ]
        mod = ast.Module(body, [])
        with pytest.raises(ValueError) as cm:
            compile(mod, "test", "exec")
        self.assertIn("invalid integer value: None", str(cm.exception))

    def test_level_as_none(self):
        body = [
            ast.ImportFrom(
                module="time",
                names=[ast.alias(name="sleep")],
                level=None,
                lineno=0,
                col_offset=0,
            )
        ]
        mod = ast.Module(body, [])
        code = compile(mod, "test", "exec")
        ns = {}
        exec(code, ns)
        self.assertIn("sleep", ns)


class ASTValidatorTests:
    def mod(self, mod, msg=None, mode="exec", *, exc=ValueError):
        mod.lineno = mod.col_offset = 0
        ast.fix_missing_locations(mod)
        if msg is None:
            compile(mod, "<test>", mode)
        else:
            with pytest.raises(exc) as cm:
                compile(mod, "<test>", mode)
            self.assertIn(msg, str(cm.exception))

    def expr(self, node, msg=None, *, exc=ValueError):
        mod = ast.Module([ast.Expr(node)], [])
        self.mod(mod, msg, exc=exc)

    def stmt(self, stmt, msg=None):
        mod = ast.Module([stmt], [])
        self.mod(mod, msg)

    def test_module(self):
        m = ast.Interactive([ast.Expr(ast.Name("x", ast.Store()))])
        self.mod(m, "must have Load context", "single")
        m = ast.Expression(ast.Name("x", ast.Store()))
        self.mod(m, "must have Load context", "eval")

    def _check_arguments(self, fac, check):
        def arguments(
            args=None,
            posonlyargs=None,
            vararg=None,
            kwonlyargs=None,
            kwarg=None,
            defaults=None,
            kw_defaults=None,
        ):
            if args is None:
                args = []
            if posonlyargs is None:
                posonlyargs = []
            if kwonlyargs is None:
                kwonlyargs = []
            if defaults is None:
                defaults = []
            if kw_defaults is None:
                kw_defaults = []
            args = ast.arguments(
                args, posonlyargs, vararg, kwonlyargs, kw_defaults, kwarg, defaults
            )
            return fac(args)

        args = [ast.arg("x", ast.Name("x", ast.Store()))]
        check(arguments(args=args), "must have Load context")
        check(arguments(posonlyargs=args), "must have Load context")
        check(arguments(kwonlyargs=args), "must have Load context")
        check(arguments(defaults=[ast.Num(3)]), "more positional defaults than args")
        check(
            arguments(kw_defaults=[ast.Num(4)]),
            "length of kwonlyargs is not the same as kw_defaults",
        )
        args = [ast.arg("x", ast.Name("x", ast.Load()))]
        check(
            arguments(args=args, defaults=[ast.Name("x", ast.Store())]),
            "must have Load context",
        )
        args = [
            ast.arg("a", ast.Name("x", ast.Load())),
            ast.arg("b", ast.Name("y", ast.Load())),
        ]
        check(
            arguments(kwonlyargs=args, kw_defaults=[None, ast.Name("x", ast.Store())]),
            "must have Load context",
        )

    def test_funcdef(self):
        a = ast.arguments([], [], None, [], [], None, [])
        f = ast.FunctionDef("x", a, [], [], None)
        self.stmt(f, "empty body on FunctionDef")
        f = ast.FunctionDef("x", a, [ast.Pass()], [ast.Name("x", ast.Store())], None)
        self.stmt(f, "must have Load context")
        f = ast.FunctionDef("x", a, [ast.Pass()], [], ast.Name("x", ast.Store()))
        self.stmt(f, "must have Load context")

        def fac(args):
            return ast.FunctionDef("x", args, [ast.Pass()], [], None)

        self._check_arguments(fac, self.stmt)

    def test_classdef(self):
        def cls(bases=None, keywords=None, body=None, decorator_list=None):
            if bases is None:
                bases = []
            if keywords is None:
                keywords = []
            if body is None:
                body = [ast.Pass()]
            if decorator_list is None:
                decorator_list = []
            return ast.ClassDef("myclass", bases, keywords, body, decorator_list)

        self.stmt(cls(bases=[ast.Name("x", ast.Store())]), "must have Load context")
        self.stmt(
            cls(keywords=[ast.keyword("x", ast.Name("x", ast.Store()))]),
            "must have Load context",
        )
        self.stmt(cls(body=[]), "empty body on ClassDef")
        self.stmt(cls(body=[None]), "None disallowed")
        self.stmt(
            cls(decorator_list=[ast.Name("x", ast.Store())]), "must have Load context"
        )

    def test_delete(self):
        self.stmt(ast.Delete([]), "empty targets on Delete")
        self.stmt(ast.Delete([None]), "None disallowed")
        self.stmt(ast.Delete([ast.Name("x", ast.Load())]), "must have Del context")

    def test_assign(self):
        self.stmt(ast.Assign([], ast.Num(3)), "empty targets on Assign")
        self.stmt(ast.Assign([None], ast.Num(3)), "None disallowed")
        self.stmt(
            ast.Assign([ast.Name("x", ast.Load())], ast.Num(3)),
            "must have Store context",
        )
        self.stmt(
            ast.Assign([ast.Name("x", ast.Store())], ast.Name("y", ast.Store())),
            "must have Load context",
        )

    def test_augassign(self):
        aug = ast.AugAssign(
            ast.Name("x", ast.Load()), ast.Add(), ast.Name("y", ast.Load())
        )
        self.stmt(aug, "must have Store context")
        aug = ast.AugAssign(
            ast.Name("x", ast.Store()), ast.Add(), ast.Name("y", ast.Store())
        )
        self.stmt(aug, "must have Load context")

    def test_for(self):
        x = ast.Name("x", ast.Store())
        y = ast.Name("y", ast.Load())
        p = ast.Pass()
        self.stmt(ast.For(x, y, [], []), "empty body on For")
        self.stmt(
            ast.For(ast.Name("x", ast.Load()), y, [p], []), "must have Store context"
        )
        self.stmt(
            ast.For(x, ast.Name("y", ast.Store()), [p], []), "must have Load context"
        )
        e = ast.Expr(ast.Name("x", ast.Store()))
        self.stmt(ast.For(x, y, [e], []), "must have Load context")
        self.stmt(ast.For(x, y, [p], [e]), "must have Load context")

    def test_while(self):
        self.stmt(ast.While(ast.Num(3), [], []), "empty body on While")
        self.stmt(
            ast.While(ast.Name("x", ast.Store()), [ast.Pass()], []),
            "must have Load context",
        )
        self.stmt(
            ast.While(ast.Num(3), [ast.Pass()], [ast.Expr(ast.Name("x", ast.Store()))]),
            "must have Load context",
        )

    def test_if(self):
        self.stmt(ast.If(ast.Num(3), [], []), "empty body on If")
        i = ast.If(ast.Name("x", ast.Store()), [ast.Pass()], [])
        self.stmt(i, "must have Load context")
        i = ast.If(ast.Num(3), [ast.Expr(ast.Name("x", ast.Store()))], [])
        self.stmt(i, "must have Load context")
        i = ast.If(ast.Num(3), [ast.Pass()], [ast.Expr(ast.Name("x", ast.Store()))])
        self.stmt(i, "must have Load context")

    def test_with(self):
        p = ast.Pass()
        self.stmt(ast.With([], [p]), "empty items on With")
        i = ast.withitem(ast.Num(3), None)
        self.stmt(ast.With([i], []), "empty body on With")
        i = ast.withitem(ast.Name("x", ast.Store()), None)
        self.stmt(ast.With([i], [p]), "must have Load context")
        i = ast.withitem(ast.Num(3), ast.Name("x", ast.Load()))
        self.stmt(ast.With([i], [p]), "must have Store context")

    def test_raise(self):
        r = ast.Raise(None, ast.Num(3))
        self.stmt(r, "Raise with cause but no exception")
        r = ast.Raise(ast.Name("x", ast.Store()), None)
        self.stmt(r, "must have Load context")
        r = ast.Raise(ast.Num(4), ast.Name("x", ast.Store()))
        self.stmt(r, "must have Load context")

    def test_try(self):
        p = ast.Pass()
        t = ast.Try([], [], [], [p])
        self.stmt(t, "empty body on Try")
        t = ast.Try([ast.Expr(ast.Name("x", ast.Store()))], [], [], [p])
        self.stmt(t, "must have Load context")
        t = ast.Try([p], [], [], [])
        self.stmt(t, "Try has neither except handlers nor finalbody")
        t = ast.Try([p], [], [p], [p])
        self.stmt(t, "Try has orelse but no except handlers")
        t = ast.Try([p], [ast.ExceptHandler(None, "x", [])], [], [])
        self.stmt(t, "empty body on ExceptHandler")
        e = [ast.ExceptHandler(ast.Name("x", ast.Store()), "y", [p])]
        self.stmt(ast.Try([p], e, [], []), "must have Load context")
        e = [ast.ExceptHandler(None, "x", [p])]
        t = ast.Try([p], e, [ast.Expr(ast.Name("x", ast.Store()))], [p])
        self.stmt(t, "must have Load context")
        t = ast.Try([p], e, [p], [ast.Expr(ast.Name("x", ast.Store()))])
        self.stmt(t, "must have Load context")

    def test_assert(self):
        self.stmt(
            ast.Assert(ast.Name("x", ast.Store()), None), "must have Load context"
        )
        assrt = ast.Assert(ast.Name("x", ast.Load()), ast.Name("y", ast.Store()))
        self.stmt(assrt, "must have Load context")

    def test_import(self):
        self.stmt(ast.Import([]), "empty names on Import")

    def test_importfrom(self):
        imp = ast.ImportFrom(None, [ast.alias("x", None)], -42)
        self.stmt(imp, "Negative ImportFrom level")
        self.stmt(ast.ImportFrom(None, [], 0), "empty names on ImportFrom")

    def test_global(self):
        self.stmt(ast.Global([]), "empty names on Global")

    def test_nonlocal(self):
        self.stmt(ast.Nonlocal([]), "empty names on Nonlocal")

    def test_expr(self):
        e = ast.Expr(ast.Name("x", ast.Store()))
        self.stmt(e, "must have Load context")

    def test_boolop(self):
        b = ast.BoolOp(ast.And(), [])
        self.expr(b, "less than 2 values")
        b = ast.BoolOp(ast.And(), [ast.Num(3)])
        self.expr(b, "less than 2 values")
        b = ast.BoolOp(ast.And(), [ast.Num(4), None])
        self.expr(b, "None disallowed")
        b = ast.BoolOp(ast.And(), [ast.Num(4), ast.Name("x", ast.Store())])
        self.expr(b, "must have Load context")

    def test_unaryop(self):
        u = ast.UnaryOp(ast.Not(), ast.Name("x", ast.Store()))
        self.expr(u, "must have Load context")

    def test_lambda(self):
        a = ast.arguments([], [], None, [], [], None, [])
        self.expr(ast.Lambda(a, ast.Name("x", ast.Store())), "must have Load context")

        def fac(args):
            return ast.Lambda(args, ast.Name("x", ast.Load()))

        self._check_arguments(fac, self.expr)

    def test_ifexp(self):
        l = ast.Name("x", ast.Load())
        s = ast.Name("y", ast.Store())
        for args in (s, l, l), (l, s, l), (l, l, s):
            self.expr(ast.IfExp(*args), "must have Load context")

    def test_dict(self):
        d = ast.Dict([], [ast.Name("x", ast.Load())])
        self.expr(d, "same number of keys as values")
        d = ast.Dict([ast.Name("x", ast.Load())], [None])
        self.expr(d, "None disallowed")

    def test_set(self):
        self.expr(ast.Set([None]), "None disallowed")
        s = ast.Set([ast.Name("x", ast.Store())])
        self.expr(s, "must have Load context")

    def _check_comprehension(self, fac):
        self.expr(fac([]), "comprehension with no generators")
        g = ast.comprehension(
            ast.Name("x", ast.Load()), ast.Name("x", ast.Load()), [], 0
        )
        self.expr(fac([g]), "must have Store context")
        g = ast.comprehension(
            ast.Name("x", ast.Store()), ast.Name("x", ast.Store()), [], 0
        )
        self.expr(fac([g]), "must have Load context")
        x = ast.Name("x", ast.Store())
        y = ast.Name("y", ast.Load())
        g = ast.comprehension(x, y, [None], 0)
        self.expr(fac([g]), "None disallowed")
        g = ast.comprehension(x, y, [ast.Name("x", ast.Store())], 0)
        self.expr(fac([g]), "must have Load context")

    def _simple_comp(self, fac):
        g = ast.comprehension(
            ast.Name("x", ast.Store()), ast.Name("x", ast.Load()), [], 0
        )
        self.expr(fac(ast.Name("x", ast.Store()), [g]), "must have Load context")

        def wrap(gens):
            return fac(ast.Name("x", ast.Store()), gens)

        self._check_comprehension(wrap)

    def test_listcomp(self):
        self._simple_comp(ast.ListComp)

    def test_setcomp(self):
        self._simple_comp(ast.SetComp)

    def test_generatorexp(self):
        self._simple_comp(ast.GeneratorExp)

    def test_dictcomp(self):
        g = ast.comprehension(
            ast.Name("y", ast.Store()), ast.Name("p", ast.Load()), [], 0
        )
        c = ast.DictComp(ast.Name("x", ast.Store()), ast.Name("y", ast.Load()), [g])
        self.expr(c, "must have Load context")
        c = ast.DictComp(ast.Name("x", ast.Load()), ast.Name("y", ast.Store()), [g])
        self.expr(c, "must have Load context")

        def factory(comps):
            k = ast.Name("x", ast.Load())
            v = ast.Name("y", ast.Load())
            return ast.DictComp(k, v, comps)

        self._check_comprehension(factory)

    def test_yield(self):
        self.expr(ast.Yield(ast.Name("x", ast.Store())), "must have Load")
        self.expr(ast.YieldFrom(ast.Name("x", ast.Store())), "must have Load")

    def test_compare(self):
        left = ast.Name("x", ast.Load())
        comp = ast.Compare(left, [ast.In()], [])
        self.expr(comp, "no comparators")
        comp = ast.Compare(left, [ast.In()], [ast.Num(4), ast.Num(5)])
        self.expr(comp, "different number of comparators and operands")
        comp = ast.Compare(ast.Num("blah"), [ast.In()], [left])
        self.expr(comp)
        comp = ast.Compare(left, [ast.In()], [ast.Num("blah")])
        self.expr(comp)

    def test_call(self):
        func = ast.Name("x", ast.Load())
        args = [ast.Name("y", ast.Load())]
        keywords = [ast.keyword("w", ast.Name("z", ast.Load()))]
        call = ast.Call(ast.Name("x", ast.Store()), args, keywords)
        self.expr(call, "must have Load context")
        call = ast.Call(func, [None], keywords)
        self.expr(call, "None disallowed")
        bad_keywords = [ast.keyword("w", ast.Name("z", ast.Store()))]
        call = ast.Call(func, args, bad_keywords)
        self.expr(call, "must have Load context")

    def test_num(self):
        class subint(int):
            pass

        class subfloat(float):
            pass

        class subcomplex(complex):
            pass

        for obj in "0", "hello":
            self.expr(ast.Num(obj))
        for obj in subint(), subfloat(), subcomplex():
            self.expr(ast.Num(obj), "invalid type", exc=TypeError)

    def test_attribute(self):
        attr = ast.Attribute(ast.Name("x", ast.Store()), "y", ast.Load())
        self.expr(attr, "must have Load context")

    def test_subscript(self):
        sub = ast.Subscript(ast.Name("x", ast.Store()), ast.Num(3), ast.Load())
        self.expr(sub, "must have Load context")
        x = ast.Name("x", ast.Load())
        sub = ast.Subscript(x, ast.Name("y", ast.Store()), ast.Load())
        self.expr(sub, "must have Load context")
        s = ast.Name("x", ast.Store())
        for args in (s, None, None), (None, s, None), (None, None, s):
            sl = ast.Slice(*args)
            self.expr(ast.Subscript(x, sl, ast.Load()), "must have Load context")
        sl = ast.Tuple([], ast.Load())
        self.expr(ast.Subscript(x, sl, ast.Load()))
        sl = ast.Tuple([s], ast.Load())
        self.expr(ast.Subscript(x, sl, ast.Load()), "must have Load context")

    def test_starred(self):
        left = ast.List(
            [ast.Starred(ast.Name("x", ast.Load()), ast.Store())], ast.Store()
        )
        assign = ast.Assign([left], ast.Num(4))
        self.stmt(assign, "must have Store context")

    def _sequence(self, fac):
        self.expr(fac([None], ast.Load()), "None disallowed")
        self.expr(
            fac([ast.Name("x", ast.Store())], ast.Load()), "must have Load context"
        )

    def test_list(self):
        self._sequence(ast.List)

    def test_tuple(self):
        self._sequence(ast.Tuple)

    def test_nameconstant(self):
        self.expr(ast.Constant(4))

    def test_stdlib_validates(self):
        stdlib = os.path.dirname(ast.__file__)
        tests = [fn for fn in os.listdir(stdlib) if fn.endswith(".py")]
        tests.extend(["test/test_grammar.py", "test/test_unpack_ex.py"])
        for module in tests:
            with self.subTest(module):
                fn = os.path.join(stdlib, module)
                with open(fn, "r", encoding="utf-8") as fp:
                    source = fp.read()
                mod = ast.parse(source, fn)
                compile(mod, fn, "exec")


class ConstantTests:
    """Tests on the ast.Constant node type."""

    def compile_constant(self, value):
        tree = ast.parse("x = 123")

        node = tree.body[0].value
        new_node = ast.Constant(value=value)
        ast.copy_location(new_node, node)
        tree.body[0].value = new_node

        code = compile(tree, "<string>", "exec")

        ns = {}
        exec(code, ns)
        return ns["x"]

    def test_validation(self):
        with pytest.raises(TypeError) as cm:
            self.compile_constant([1, 2, 3])
        assert str(cm.exception) == "got an invalid type in Constant: list"

    def test_singletons(self):
        for const in (None, False, True, Ellipsis, b"", frozenset()):
            with self.subTest(const=const):
                value = self.compile_constant(const)
                self.assertIs(value, const)

    def test_values(self):
        nested_tuple = (1,)
        nested_frozenset = frozenset({1})
        for level in range(3):
            nested_tuple = (nested_tuple, 2)
            nested_frozenset = frozenset({nested_frozenset, 2})
        values = (
            123,
            123.0,
            123j,
            "unicode",
            b"bytes",
            tuple("tuple"),
            frozenset("frozenset"),
            nested_tuple,
            nested_frozenset,
        )
        for value in values:
            with self.subTest(value=value):
                result = self.compile_constant(value)
                assert result == value

    def test_assign_to_constant(self):
        tree = ast.parse("x = 1")

        target = tree.body[0].targets[0]
        new_target = ast.Constant(value=1)
        ast.copy_location(new_target, target)
        tree.body[0].targets[0] = new_target

        with pytest.raises(ValueError) as cm:
            compile(tree, "string", "exec")
        assert (
            str(cm.exception) == "expression which can't be assigned "
            "to in Store context"
        )

    def test_get_docstring(self):
        tree = ast.parse("'docstring'\nx = 1")
        assert ast.get_docstring(tree) == "docstring"

    def get_load_const(self, tree):
        # Compile to bytecode, disassemble and get parameter of LOAD_CONST
        # instructions
        co = compile(tree, "<string>", "exec")
        consts = []
        for instr in dis.get_instructions(co):
            if instr.opname == "LOAD_CONST":
                consts.append(instr.argval)
        return consts

    @support.cpython_only
    def test_load_const(self):
        consts = [None, True, False, 124, 2.0, 3j, "unicode", b"bytes", (1, 2, 3)]

        code = "\n".join(["x={!r}".format(const) for const in consts])
        code += "\nx = ..."
        consts.extend((Ellipsis, None))

        tree = ast.parse(code)
        assert self.get_load_const(tree) == consts

        # Replace expression nodes with constants
        for assign, const in zip(tree.body, consts):
            assert isinstance(assign, ast.Assign), ast.dump(assign)
            new_node = ast.Constant(value=const)
            ast.copy_location(new_node, assign.value)
            assign.value = new_node

        assert self.get_load_const(tree) == consts

    def test_literal_eval(self):
        tree = ast.parse("1 + 2")
        binop = tree.body[0].value

        new_left = ast.Constant(value=10)
        ast.copy_location(new_left, binop.left)
        binop.left = new_left

        new_right = ast.Constant(value=20j)
        ast.copy_location(new_right, binop.right)
        binop.right = new_right

        assert ast.literal_eval(binop) == 10 + 20j

    def test_string_kind(self):
        c = ast.parse('"x"', mode="eval").body
        assert c.value == "x"
        assert c.kind == None

        c = ast.parse('u"x"', mode="eval").body
        assert c.value == "x"
        assert c.kind == "u"

        c = ast.parse('r"x"', mode="eval").body
        assert c.value == "x"
        assert c.kind == None

        c = ast.parse('b"x"', mode="eval").body
        assert c.value == b"x"
        assert c.kind == None


class EndPositionTests:
    """Tests for end position of AST nodes.

    Testing end positions of nodes requires a bit of extra care
    because of how LL parsers work.
    """

    def _check_end_pos(self, ast_node, end_lineno, end_col_offset):
        assert ast_node.end_lineno == end_lineno
        assert ast_node.end_col_offset == end_col_offset

    def _check_content(self, source, ast_node, content):
        assert ast.get_source_segment(source, ast_node) == content

    def _parse_value(self, s):
        # Use duck-typing to support both single expression
        # and a right hand side of an assignment statement.
        return ast.parse(s).body[0].value

    def test_lambda(self):
        s = "lambda x, *y: None"
        lam = self._parse_value(s)
        self._check_content(s, lam.body, "None")
        self._check_content(s, lam.args.args[0], "x")
        self._check_content(s, lam.args.vararg, "y")

    def test_func_def(self):
        s = dedent(
            """
            def func(x: int,
                     *args: str,
                     z: float = 0,
                     **kwargs: Any) -> bool:
                return True
            """
        ).strip()
        fdef = ast.parse(s).body[0]
        self._check_end_pos(fdef, 5, 15)
        self._check_content(s, fdef.body[0], "return True")
        self._check_content(s, fdef.args.args[0], "x: int")
        self._check_content(s, fdef.args.args[0].annotation, "int")
        self._check_content(s, fdef.args.kwarg, "kwargs: Any")
        self._check_content(s, fdef.args.kwarg.annotation, "Any")

    def test_call(self):
        s = "func(x, y=2, **kw)"
        call = self._parse_value(s)
        self._check_content(s, call.func, "func")
        self._check_content(s, call.keywords[0].value, "2")
        self._check_content(s, call.keywords[1].value, "kw")

    def test_call_noargs(self):
        s = "x[0]()"
        call = self._parse_value(s)
        self._check_content(s, call.func, "x[0]")
        self._check_end_pos(call, 1, 6)

    def test_class_def(self):
        s = dedent(
            """
            class C(A, B):
                x: int = 0
        """
        ).strip()
        cdef = ast.parse(s).body[0]
        self._check_end_pos(cdef, 2, 14)
        self._check_content(s, cdef.bases[1], "B")
        self._check_content(s, cdef.body[0], "x: int = 0")

    def test_class_kw(self):
        s = "class S(metaclass=abc.ABCMeta): pass"
        cdef = ast.parse(s).body[0]
        self._check_content(s, cdef.keywords[0].value, "abc.ABCMeta")

    def test_multi_line_str(self):
        s = dedent(
            '''
            x = """Some multi-line text.

            It goes on starting from same indent."""
        '''
        ).strip()
        assign = ast.parse(s).body[0]
        self._check_end_pos(assign, 3, 40)
        self._check_end_pos(assign.value, 3, 40)

    def test_continued_str(self):
        s = dedent(
            """
            x = "first part" \\
            "second part"
        """
        ).strip()
        assign = ast.parse(s).body[0]
        self._check_end_pos(assign, 2, 13)
        self._check_end_pos(assign.value, 2, 13)

    def test_suites(self):
        # We intentionally put these into the same string to check
        # that empty lines are not part of the suite.
        s = dedent(
            """
            while True:
                pass

            if one():
                x = None
            elif other():
                y = None
            else:
                z = None

            for x, y in stuff:
                assert True

            try:
                raise RuntimeError
            except TypeError as e:
                pass

            pass
        """
        ).strip()
        mod = ast.parse(s)
        while_loop = mod.body[0]
        if_stmt = mod.body[1]
        for_loop = mod.body[2]
        try_stmt = mod.body[3]
        pass_stmt = mod.body[4]

        self._check_end_pos(while_loop, 2, 8)
        self._check_end_pos(if_stmt, 9, 12)
        self._check_end_pos(for_loop, 12, 15)
        self._check_end_pos(try_stmt, 17, 8)
        self._check_end_pos(pass_stmt, 19, 4)

        self._check_content(s, while_loop.test, "True")
        self._check_content(s, if_stmt.body[0], "x = None")
        self._check_content(s, if_stmt.orelse[0].test, "other()")
        self._check_content(s, for_loop.target, "x, y")
        self._check_content(s, try_stmt.body[0], "raise RuntimeError")
        self._check_content(s, try_stmt.handlers[0].type, "TypeError")

    def test_fstring(self):
        s = 'x = f"abc {x + y} abc"'
        fstr = self._parse_value(s)
        binop = fstr.values[1].value
        self._check_content(s, binop, "x + y")

    def test_fstring_multi_line(self):
        s = dedent(
            '''
            f"""Some multi-line text.
            {
            arg_one
            +
            arg_two
            }
            It goes on..."""
        '''
        ).strip()
        fstr = self._parse_value(s)
        binop = fstr.values[1].value
        self._check_end_pos(binop, 5, 7)
        self._check_content(s, binop.left, "arg_one")
        self._check_content(s, binop.right, "arg_two")

    def test_import_from_multi_line(self):
        s = dedent(
            """
            from x.y.z import (
                a, b, c as c
            )
        """
        ).strip()
        imp = ast.parse(s).body[0]
        self._check_end_pos(imp, 3, 1)

    def test_slices(self):
        s1 = "f()[1, 2] [0]"
        s2 = "x[ a.b: c.d]"
        sm = dedent(
            """
            x[ a.b: f () ,
               g () : c.d
              ]
        """
        ).strip()
        i1, i2, im = map(self._parse_value, (s1, s2, sm))
        self._check_content(s1, i1.value, "f()[1, 2]")
        self._check_content(s1, i1.value.slice, "1, 2")
        self._check_content(s2, i2.slice.lower, "a.b")
        self._check_content(s2, i2.slice.upper, "c.d")
        self._check_content(sm, im.slice.elts[0].upper, "f ()")
        self._check_content(sm, im.slice.elts[1].lower, "g ()")
        self._check_end_pos(im, 3, 3)

    def test_binop(self):
        s = dedent(
            """
            (1 * 2 + (3 ) +
                 4
            )
        """
        ).strip()
        binop = self._parse_value(s)
        self._check_end_pos(binop, 2, 6)
        self._check_content(s, binop.right, "4")
        self._check_content(s, binop.left, "1 * 2 + (3 )")
        self._check_content(s, binop.left.right, "3")

    def test_boolop(self):
        s = dedent(
            """
            if (one_condition and
                    (other_condition or yet_another_one)):
                pass
        """
        ).strip()
        bop = ast.parse(s).body[0].test
        self._check_end_pos(bop, 2, 44)
        self._check_content(s, bop.values[1], "other_condition or yet_another_one")

    def test_tuples(self):
        s1 = "x = () ;"
        s2 = "x = 1 , ;"
        s3 = "x = (1 , 2 ) ;"
        sm = dedent(
            """
            x = (
                a, b,
            )
        """
        ).strip()
        t1, t2, t3, tm = map(self._parse_value, (s1, s2, s3, sm))
        self._check_content(s1, t1, "()")
        self._check_content(s2, t2, "1 ,")
        self._check_content(s3, t3, "(1 , 2 )")
        self._check_end_pos(tm, 3, 1)

    def test_attribute_spaces(self):
        s = "func(x. y .z)"
        call = self._parse_value(s)
        self._check_content(s, call, s)
        self._check_content(s, call.args[0], "x. y .z")

    def test_redundant_parenthesis(self):
        s = "( ( ( a + b ) ) )"
        v = ast.parse(s).body[0].value
        assert type(v).__name__ == "BinOp"
        self._check_content(s, v, "a + b")
        s2 = "await " + s
        v = ast.parse(s2).body[0].value.value
        assert type(v).__name__ == "BinOp"
        self._check_content(s2, v, "a + b")

    def test_trailers_with_redundant_parenthesis(self):
        tests = (
            ("( ( ( a ) ) ) ( )", "Call"),
            ("( ( ( a ) ) ) ( b )", "Call"),
            ("( ( ( a ) ) ) [ b ]", "Subscript"),
            ("( ( ( a ) ) ) . b", "Attribute"),
        )
        for s, t in tests:
            with self.subTest(s):
                v = ast.parse(s).body[0].value
                assert type(v).__name__ == t
                self._check_content(s, v, s)
                s2 = "await " + s
                v = ast.parse(s2).body[0].value.value
                assert type(v).__name__ == t
                self._check_content(s2, v, s)

    def test_displays(self):
        s1 = "[{}, {1, }, {1, 2,} ]"
        s2 = "{a: b, f (): g () ,}"
        c1 = self._parse_value(s1)
        c2 = self._parse_value(s2)
        self._check_content(s1, c1.elts[0], "{}")
        self._check_content(s1, c1.elts[1], "{1, }")
        self._check_content(s1, c1.elts[2], "{1, 2,}")
        self._check_content(s2, c2.keys[1], "f ()")
        self._check_content(s2, c2.values[1], "g ()")

    def test_comprehensions(self):
        s = dedent(
            """
            x = [{x for x, y in stuff
                  if cond.x} for stuff in things]
        """
        ).strip()
        cmp = self._parse_value(s)
        self._check_end_pos(cmp, 2, 37)
        self._check_content(s, cmp.generators[0].iter, "things")
        self._check_content(s, cmp.elt.generators[0].iter, "stuff")
        self._check_content(s, cmp.elt.generators[0].ifs[0], "cond.x")
        self._check_content(s, cmp.elt.generators[0].target, "x, y")

    def test_yield_await(self):
        s = dedent(
            """
            async def f():
                yield x
                await y
        """
        ).strip()
        fdef = ast.parse(s).body[0]
        self._check_content(s, fdef.body[0].value, "yield x")
        self._check_content(s, fdef.body[1].value, "await y")

    def test_source_segment_multi(self):
        s_orig = dedent(
            """
            x = (
                a, b,
            ) + ()
        """
        ).strip()
        s_tuple = dedent(
            """
            (
                a, b,
            )
        """
        ).strip()
        binop = self._parse_value(s_orig)
        assert ast.get_source_segment(s_orig, binop.left) == s_tuple

    def test_source_segment_padded(self):
        s_orig = dedent(
            """
            class C:
                def fun(self) -> None:
                    "ЖЖЖЖЖ"
        """
        ).strip()
        s_method = "    def fun(self) -> None:\n" '        "ЖЖЖЖЖ"'
        cdef = ast.parse(s_orig).body[0]
        assert ast.get_source_segment(s_orig, cdef.body[0], padded=True) == s_method

    def test_source_segment_endings(self):
        s = "v = 1\r\nw = 1\nx = 1\n\ry = 1\rz = 1\r\n"
        v, w, x, y, z = ast.parse(s).body
        self._check_content(s, v, "v = 1")
        self._check_content(s, w, "w = 1")
        self._check_content(s, x, "x = 1")
        self._check_content(s, y, "y = 1")
        self._check_content(s, z, "z = 1")

    def test_source_segment_tabs(self):
        s = dedent(
            """
            class C:
              \t\f  def fun(self) -> None:
              \t\f      pass
        """
        ).strip()
        s_method = "  \t\f  def fun(self) -> None:\n" "  \t\f      pass"

        cdef = ast.parse(s).body[0]
        assert ast.get_source_segment(s, cdef.body[0], padded=True) == s_method


class NodeVisitorTests:
    def test_old_constant_nodes(self):
        class Visitor(ast.NodeVisitor):
            def visit_Num(self, node):
                log.append((node.lineno, "Num", node.n))

            def visit_Str(self, node):
                log.append((node.lineno, "Str", node.s))

            def visit_Bytes(self, node):
                log.append((node.lineno, "Bytes", node.s))

            def visit_NameConstant(self, node):
                log.append((node.lineno, "NameConstant", node.value))

            def visit_Ellipsis(self, node):
                log.append((node.lineno, "Ellipsis", ...))

        mod = ast.parse(
            dedent(
                """\
            i = 42
            f = 4.25
            c = 4.25j
            s = 'string'
            b = b'bytes'
            t = True
            n = None
            e = ...
            """
            )
        )
        visitor = Visitor()
        log = []
        with warnings.catch_warnings(record=True) as wlog:
            warnings.filterwarnings("always", "", DeprecationWarning)
            visitor.visit(mod)
        assert log == [
            (1, "Num", 42),
            (2, "Num", 4.25),
            (3, "Num", 4.25j),
            (4, "Str", "string"),
            (5, "Bytes", b"bytes"),
            (6, "NameConstant", True),
            (7, "NameConstant", None),
            (8, "Ellipsis", ...),
        ]

        assert [str(w.message) for w in wlog] == [
            "visit_Num is deprecated; add visit_Constant",
            "visit_Num is deprecated; add visit_Constant",
            "visit_Num is deprecated; add visit_Constant",
            "visit_Str is deprecated; add visit_Constant",
            "visit_Bytes is deprecated; add visit_Constant",
            "visit_NameConstant is deprecated; add visit_Constant",
            "visit_NameConstant is deprecated; add visit_Constant",
            "visit_Ellipsis is deprecated; add visit_Constant",
        ]


def main():
    if __name__ != "__main__":
        return
    if sys.argv[1:] == ["-g"]:
        for statements, kind in (
            (exec_tests, "exec"),
            (single_tests, "single"),
            (eval_tests, "eval"),
        ):
            print(kind + "_results = [")
            for statement in statements:
                tree = ast.parse(statement, "?", kind)
                print("%r," % (to_tuple(tree),))
            print("]")
        print("main()")
        raise SystemExit
    # unittest.main()


main()
