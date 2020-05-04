import sys
import ast

from contextlib import contextmanager, nullcontext
from enum import IntEnum, auto


class Xformer(ast.NodeVisitor):
    def __init__(self):
        self._py = []
        self._ts = []
        self._buf = []
        self._indent = 0
        self._preceds = {}

    def interleave(self, inter, f, seq):
        seq = iter(seq)
        try:
            f(next(seq))
        except StopIteration:
            pass
        else:
            for x in seq:
                inter()
                f(x)

    def items_view(self, traverser, xs):
        if len(xs) == 1:
            traverser(xs[0])
            self.write((",", None))
        else:
            self.interleave(lambda: self.write(", "), traverser, xs)

    def maybe_newline(self):
        if self._py:
            self.write("\n")

    def fill(self, t=""):
        self.maybe_newline()
        py, ts = t if isinstance(t, tuple) else (t, t)
        self.write(("    " * self._indent + py, ts))

    def write(self, t):
        py, ts = t if isinstance(t, tuple) else (t, t)
        if py:
            self._py.append(py)
        if ts:
            self._ts.append(ts)

    def buffer_writer(self, text):
        self._buf.append(text)

    @property
    def buffer(self):
        value = "".join(self._buf)
        self._buf.clear()
        return value

    @contextmanager
    def block(self):
        with self.delimit((None, " {"), (None, "} ")):
            self.write((":", None))
            self._indent += 1
            yield
            self._indent -= 1

    @contextmanager
    def delimit(self, b, e):
        self.write(b if isinstance(b, tuple) else (b, b))
        yield
        self.write(e if isinstance(e, tuple) else (e, e))

    def delimit_if(self, b, e, cond):
        if cond:
            return self.delimit(b, e)
        return nullcontext()

    def require_parens(self, p, n):
        return self.delimit_if("(", ")", self.get_preced(n) > p)

    def get_preced(self, n):
        return self._preceds.get(n, Precedence.TEST)

    def set_preced(self, p, *ns):
        for n in ns:
            self._preceds[n] = p

    def get_raw_doc(self, n):
        must = (ast.AsyncFunctionDef, ast.FunctionDef, ast.ClassDef, ast.Module)
        if not isinstance(n, must) or len(n.body) < 1:
            return None
        n = n.body[0]
        if not isinstance(n, ast.Expr):
            return None
        n = n.value
        if isinstance(n, ast.Constant) and isinstance(n.value, str):
            return n

    def traverse(self, n):
        if isinstance(n, list):
            for x in n:
                self.traverse(x)
        else:
            super().visit(n)

    def visit(self, n):
        self._py = []
        self._ts = []
        self.traverse(n)
        return "".join(self._py), "".join(self._ts)

    def _write_doc_and_traverse(self, n):
        if (d := self.get_raw_doc(n)) :
            self._write_doc(d)
            self.traverse(n.body[1:])
        else:
            self.traverse(n.body)

    def visit_Module(self, n):
        self._write_doc_and_traverse(n)

    def visit_FunctionType(self, n):
        with self.delimit("(", ")"):
            self.interleave(lambda: self.write(", "), self.traverse, n.argtypes)
        self.write(" -> ")
        self.traverse(n.returns)

    def visit_Expr(self, n):
        self.fill()
        self.set_preced(Precedence.YIELD, n.value)
        self.traverse(n.value)

    def visit_NamedExpr(self, n):
        with self.require_parens(Precedence.TUPLE, n):
            self.set_preced(Precedence.ATOM, n.target, n.value)
            self.traverse(n.target)
            self.write((" := ", " = "))
            self.traverse(n.value)

    def visit_Import(self, n):
        self.fill("import ")
        self.interleave(lambda: self.write(", "), self.traverse, n.names)

    def visit_ImportFrom(self, n):
        self.fill("from ")
        self.write("." * n.level)
        if n.module:
            self.write(n.module)
        self.write(" import ")
        self.interleave(lambda: self.write(", "), self.traverse, n.names)

    def visit_Assign(self, n):
        self.fill()
        for t in n.targets:
            self.traverse(t)
            self.write(" = ")
        self.traverse(n.value)

    def visit_AugAssign(self, n):
        self.fill()
        self.traverse(n.target)
        self.write(" " + self.binop[n.op.__class__.__name__] + "= ")
        self.traverse(n.value)

    def visit_AnnAssign(self, n):
        self.fill()
        with self.delimit_if("(", ")", not n.simple and isinstance(n.target, ast.Name)):
            self.traverse(n.target)
        self.write(": ")
        self.traverse(n.annotation)
        if n.value:
            self.write(" = ")
            self.traverse(n.value)

    def visit_Return(self, n):
        self.fill("return")
        if n.value:
            self.write(" ")
            self.traverse(n.value)

    def visit_Pass(self, n):
        self.fill(("pass", None))

    def visit_Break(self, n):
        self.fill("break")

    def visit_Continue(self, n):
        self.fill("continue")

    def visit_Delete(self, n):
        self.fill(("del ", "delete "))
        self.interleave(lambda: self.write(", "), self.traverse, n.targets)

    def visit_Assert(self, n):
        self.fill("assert ")
        self.traverse(n.test)
        if n.msg:
            self.write(", ")
            self.traverse(n.msg)

    def visit_Global(self, node):
        self.fill("global ")
        self.interleave(lambda: self.write(", "), self.write, node.names)

    def visit_Nonlocal(self, node):
        self.fill("nonlocal ")
        self.interleave(lambda: self.write(", "), self.write, node.names)

    def visit_Await(self, n):
        with self.require_parens(Precedence.AWAIT, n):
            self.write("await")
            if n.value:
                self.write(" ")
                self.set_preced(Precedence.ATOM, n.value)
                self.traverse(n.value)

    def visit_Yield(self, n):
        with self.require_parens(Precedence.YIELD, n):
            self.write("yield")
            if n.value:
                self.write(" ")
                self.set_preced(Precedence.ATOM, n.value)
                self.traverse(n.value)

    def visit_YieldFrom(self, n):
        with self.require_parens(Precedence.YIELD, n):
            self.write(("yield from ", "yield* "))
            if not n.value:
                raise ValueError("Node without value attribute.")
            self.set_preced(Precedence.ATOM, n.value)
            self.traverse(n.value)

    def visit_Raise(self, n):
        self.fill(("raise", "throw"))
        if not n.exc:
            if n.cause:
                raise ValueError("Node cause without exception.")
            return
        self.write(" ")
        self.traverse(n.exc)
        if n.cause:
            self.write((" from ", None))
            self.traverse(n.cause)

    def visit_Try(self, node):
        self.fill("try")
        with self.block():
            self.traverse(node.body)
        for e in node.handlers:
            self.traverse(e)
        if node.orelse:
            self.fill("else")
            with self.block():
                self.traverse(node.orelse)
        if node.finalbody:
            self.fill("finally")
            with self.block():
                self.traverse(node.finalbody)

    def visit_ExceptHandler(self, n):
        self.fill(("except", "catch"))
        if n.type:
            with self.delimit((" ", "("), (None, ")")):
                self.traverse(n.type)
        if n.name:
            self.write(" as ")
            self.write(n.name)
        with self.block():
            self.traverse(n.body)

    def visit_ClassDef(self, n):
        self.maybe_newline()
        for deco in n.decorator_list:
            self.fill("@")
            self.traverse(deco)
        self.fill("class " + n.name)
        with self.delimit(("(", " extends "), (")", None)):
            comma = False
            for e in n.bases:
                if comma:
                    self.write(", ")
                else:
                    comma = True
                self.traverse(e)
            for e in n.keywords:
                if comma:
                    self.write(", ")
                else:
                    comma = True
                self.traverse(e)
        with self.block():
            self._write_doc_and_traverse(n)

    def visit_FunctionDef(self, n):
        self._function_helper(n, ("def", "function"))

    def visit_AsyncFunctionDef(self, n):
        self._function_helper(n, ("async def", "async function"))

    def _function_helper(self, n, t):
        self.maybe_newline()
        for deco in n.decorator_list:
            self.fill("@")
            self.traverse(deco)
        py, ts = t if isinstance(t, tuple) else (t, t)
        self.fill((f"{py} {n.name}", f"{ts} {n.name}"))
        with self.delimit("(", ")"):
            self.traverse(n.args)
        if n.returns:
            self.write((" -> ", ": "))
            self.traverse(n.returns)
        with self.block():
            self._write_doc_and_traverse(n)

    def visit_For(self, n):
        self._for_helper("for ", n)

    def visit_AsyncFor(self, n):
        self._for_helper(("async for ", "for "), n)

    def _for_helper(self, t, n):
        self.fill(t)
        with self.delimit((None, "("), (None, ")")):
            self.traverse(n.target)
            self.write((" in ", " of "))
            self.traverse(n.iter)
        with self.block():
            self.traverse(n.body)
        if n.orelse:
            self.fill("else")
            with self.block():
                self.traverse(n.orelse)

    def visit_If(self, n):
        self.fill("if ")
        with self.delimit((None, "("), (None, ")")):
            self.traverse(n.test)
        with self.block():
            self.traverse(n.body)
        while n.orelse and len(n.orelse) == 1 and isinstance(n.orelse[0], ast.If):
            n = n.orelse[0]
            self.fill(("elif ", "else if "))
            with self.delimit((None, "("), (None, ")")):
                self.traverse(n.test)
            with self.block():
                self.traverse(n.body)
        if n.orelse:
            self.fill("else")
            with self.block():
                self.traverse(n.orelse)

    def visit_While(self, n):
        self.fill("while ")
        with self.delimit((None, "("), (None, ")")):
            self.traverse(n.test)
        with self.block():
            self.traverse(n.body)
        if n.orelse:
            self.fill("else")
            with self.block():
                self.traverse(n.orelse)

    def visit_With(self, node):
        self.fill("with ")
        self.interleave(lambda: self.write(", "), self.traverse, node.items)
        with self.block():
            self.traverse(node.body)

    def visit_AsyncWith(self, node):
        self.fill("async with ")
        self.interleave(lambda: self.write(", "), self.traverse, node.items)
        with self.block():
            self.traverse(node.body)

    def visit_JoinedStr(self, node):
        self.write("f")
        self._fstring_JoinedStr(node, self.buffer_writer)
        self.write(repr(self.buffer))

    def visit_FormattedValue(self, node):
        self.write("f")
        self._fstring_FormattedValue(node, self.buffer_writer)
        self.write(repr(self.buffer))

    def _fstring_JoinedStr(self, node, write):
        for value in node.values:
            meth = getattr(self, "_fstring_" + type(value).__name__)
            meth(value, write)

    def _fstring_Constant(self, node, write):
        if not isinstance(node.value, str):
            raise ValueError("Constants inside JoinedStr should be a string.")
        value = node.value.replace("{", "{{").replace("}", "}}")
        write(value)

    def _fstring_FormattedValue(self, node, write):
        write("{")
        unparser = type(self)()
        unparser.set_preced(Precedence.TEST.next(), node.value)
        expr, _ = unparser.visit(node.value)
        if expr.startswith("{"):
            write(" ")  # Separate pair of opening brackets as "{ {"
        write(expr)
        if node.conversion != -1:
            conversion = chr(node.conversion)
            if conversion not in "sra":
                raise ValueError("Unknown f-string conversion.")
            write(f"!{conversion}")
        if node.format_spec:
            write(":")
            meth = getattr(self, "_fstring_" + type(node.format_spec).__name__)
            meth(node.format_spec, write)
        write("}")

    def visit_Name(self, n):
        self.write(n.id)

    def _write_doc(self, n):
        self.fill()
        if n.kind == "u":
            self.write("u")
        v = n.value.replace("\\", "\\\\")
        v = v.replace('"""', '"""')
        if v[-1] == '"':
            v = v.replace('"', '\\"', -1)
        self.write((f'"""{v}"""', None))

    def _write_constant(self, v):
        if isinstance(v, (float, complex)):
            self.write(repr(v).replace("inf", _INFSTR))
        else:
            self.write(repr(v))

    def visit_Constant(self, n):
        v = n.value
        if isinstance(v, tuple):
            with self.delimit("(", ")"):
                self.items_view(self._write_constant, v)
        elif v is ...:
            self.write("...")
        else:
            if n.kind == "u":
                self.write("u")
            self._write_constant(n.value)

    def visit_List(self, n):
        with self.delimit("[", "]"):
            self.interleave(lambda: self.write(", "), self.traverse, n.elts)

    def visit_ListComp(self, n):
        with self.delimit("[", "]"):
            self.traverse(n.elt)
            for g in n.generators:
                self.traverse(g)

    def visit_GeneratorExp(self, n):
        with self.delimit("(", ")"):
            self.traverse(n.elt)
            for g in n.generators:
                self.traverse(g)

    def visit_SetComp(self, n):
        with self.delimit("{", "}"):
            self.traverse(n.elt)
            for g in n.generators:
                self.traverse(g)

    def visit_DictComp(self, n):
        with self.delimit("{", "}"):
            self.traverse(n.key)
            self.write(": ")
            self.traverse(n.value)
            for g in n.generators:
                self.traverse(g)

    def visit_comprehension(self, node):
        if node.is_async:
            self.write(" async for ")
        else:
            self.write(" for ")
        self.set_preced(Precedence.TUPLE, node.target)
        self.traverse(node.target)
        self.write(" in ")
        self.set_preced(Precedence.TEST.next(), node.iter, *node.ifs)
        self.traverse(node.iter)
        for if_clause in node.ifs:
            self.write(" if ")
            self.traverse(if_clause)

    def visit_IfExp(self, node):
        with self.require_parens(Precedence.TEST, node):
            self.set_preced(Precedence.TEST.next(), node.body, node.test)
            self.traverse(node.body)
            self.write((" if ", " ? "))
            self.traverse(node.test)
            self.write((" else ", " : "))
            self.set_preced(Precedence.TEST, node.orelse)
            self.traverse(node.orelse)

    def visit_Set(self, n):
        if not n.elts:
            raise ValueError("Set node should have at least one item")
        with self.delimit("{", "}"):
            self.interleave(lambda: self.write(", "), self.traverse, n.elts)

    def visit_Dict(self, n):
        def write_pair(k, v):
            self.traverse(k)
            self.write(": ")
            self.traverse(v)

        def write_item(i):
            k, v = i
            if k is None:
                self.write("**")
                self.set_preced(Precedence.EXPR, v)
                self.traverse(v)
            else:
                write_pair(k, v)

        with self.delimit("{", "}"):
            self.interleave(lambda: self.write(", "), write_item, zip(n.keys, n.values))

    def visit_Tuple(self, n):
        with self.delimit(("(", "["), (")", "]")):
            self.items_view(self.traverse, n.elts)

    unop = {"Invert": "~", "Not": "not", "UAdd": "+", "USub": "-"}
    unop_precedence = {
        "~": Precedence.FACTOR,
        "not": Precedence.NOT,
        "+": Precedence.FACTOR,
        "-": Precedence.FACTOR,
    }

    def visit_UnaryOp(self, n):
        o = self.unop[n.op.__class__.__name__]
        p = self.unop_precedence[o]
        with self.require_parens(p, n):
            self.write(o)
            self.write(" ")
            self.set_preced(p, n.operand)
            self.traverse(n.operand)

    binop = {
        "Add": "+",
        "Sub": "-",
        "Mult": "*",
        "MatMult": "@",
        "Div": "/",
        "Mod": "%",
        "LShift": "<<",
        "RShift": ">>",
        "BitOr": "|",
        "BitXor": "^",
        "BitAnd": "&",
        "FloorDiv": "//",
        "Pow": "**",
    }

    binop_precedence = {
        "+": Precedence.ARITH,
        "-": Precedence.ARITH,
        "*": Precedence.TERM,
        "@": Precedence.TERM,
        "/": Precedence.TERM,
        "%": Precedence.TERM,
        "<<": Precedence.SHIFT,
        ">>": Precedence.SHIFT,
        "|": Precedence.BOR,
        "^": Precedence.BXOR,
        "&": Precedence.BAND,
        "//": Precedence.TERM,
        "**": Precedence.POWER,
    }

    binop_rassoc = frozenset(("**",))

    def visit_BinOp(self, n):
        o = self.binop[n.op.__class__.__name__]
        p = self.binop_precedence[o]
        with self.require_parens(p, n):
            if o in self.binop_rassoc:
                left = p.next()
                right = p
            else:
                left = p
                right = p.next()
            self.set_preced(left, n.left)
            self.traverse(n.left)
            self.write(f" {o} ")
            self.set_preced(right, n.right)
            self.traverse(n.right)

    cmpops = {
        "Eq": "==",
        "NotEq": "!=",
        "Lt": "<",
        "LtE": "<=",
        "Gt": ">",
        "GtE": ">=",
        "Is": "is",
        "IsNot": "is not",
        "In": "in",
        "NotIn": "not in",
    }

    def visit_Compare(self, node):
        with self.require_parens(Precedence.CMP, node):
            self.set_preced(Precedence.CMP.next(), node.left, *node.comparators)
            self.traverse(node.left)
            for o, e in zip(node.ops, node.comparators):
                self.write(" " + self.cmpops[o.__class__.__name__] + " ")
                self.traverse(e)

    boolops = {"And": "and", "Or": "or"}
    boolop_precedence = {"and": Precedence.AND, "or": Precedence.OR}

    def visit_BoolOp(self, n):
        o = self.boolops[n.op.__class__.__name__]
        p = self.boolop_precedence[o]

        def increasing_level_traverse(node):
            nonlocal p
            p = p.next()
            self.set_preced(p, node)
            self.traverse(node)

        with self.require_parens(p, n):
            s = f" {o} "
            self.interleave(lambda: self.write(s), increasing_level_traverse, n.values)

    def visit_Attribute(self, n):
        self.set_preced(Precedence.ATOM, n.value)
        self.traverse(n.value)
        # Special case: 3.__abs__() is a syntax error, so if node.value
        # is an integer literal then we need to either parenthesize
        # it or add an extra space to get 3 .__abs__().
        if isinstance(n.value, ast.Constant) and isinstance(n.value.value, int):
            self.write(" ")
        self.write(".")
        self.write(n.attr)

    def _call_helper(self, n):
        if isinstance(n.func, ast.Name):
            if n.func.id == "print":
                return ast.Attribute(ast.Name("console"), "log")
            if n.func.id == "len" and len(n.args) == 1:
                return ast.Attribute(n.args[0], "length")
            if n.func.id == "str" and len(n.args) == 1:
                return ast.Attribute(ast.Name(n.args[0]), "toString")

    def _call_new(self, x):
        def getNameString(x):
            if isinstance(x, ast.Name):
                return x.id
            elif isinstance(x, ast.Attribute):
                return str(x.attr)
            elif isinstance(x, ast.Subscript) and isinstance(x.slice, ast.Index):
                return str(x.slice.value)

        NAME_STRING = getNameString(x.func)

        if NAME_STRING and re.search(r"^[A-Z]", NAME_STRING):
            # TODO: generalize args mangling and apply here
            # assert not any([x.keywords, x.starargs, x.kw])
            subj = x
        elif isinstance(x.func, ast.Name) and x.func.id == "new":
            subj = x.args[0]
        else:
            subj = None
        if subj:
            return Call_default(t, subj, operator="new ")

    def visit_Call(self, n):
        self.set_preced(Precedence.ATOM, n.func)
        self.traverse(n.func)
        # len -> length, str -> toString, print -> console.log
        # isinstance(n.func, ast.Name) and x.func.id == "print"
        with self.delimit("(", ")"):
            comma = False
            for e in n.args:
                if comma:
                    self.write(", ")
                else:
                    comma = True
                self.traverse(e)
            for e in n.keywords:
                if comma:
                    self.write(", ")
                else:
                    comma = True
                self.traverse(e)

    def visit_Subscript(self, n):
        self.set_preced(Precedence.ATOM, n.value)
        self.traverse(n.value)
        with self.delimit("[", "]"):
            if isinstance(n.slice, ast.Tuple) and n.slice.elts:
                self.items_view(self.traverse, n.slice.elts)
            else:
                self.traverse(n.slice)

    def visit_Starred(self, node):
        self.write("*")
        self.set_preced(Precedence.EXPR, node.value)
        self.traverse(node.value)

    def visit_Ellipsis(self, n):
        self.write("...")

    def visit_Slice(self, n):
        if n.lower:
            self.traverse(n.lower)
        self.write(":")
        if n.upper:
            self.traverse(n.upper)
        if n.step:
            self.write(":")
            self.traverse(n.step)

    def visit_arg(self, node):
        self.write(node.arg)
        if node.annotation:
            self.write(": ")
            self.traverse(node.annotation)

    def visit_arguments(self, node):
        first = True
        all_args = node.posonlyargs + node.args
        defaults = [None] * (len(all_args) - len(node.defaults)) + node.defaults
        for index, elements in enumerate(zip(all_args, defaults), 1):
            a, d = elements
            if first:
                first = False
            else:
                self.write(", ")
            self.traverse(a)
            if d:
                self.write("=")
                self.traverse(d)
            if index == len(node.posonlyargs):
                self.write(", /")
        if node.vararg or node.kwonlyargs:
            if first:
                first = False
            else:
                self.write(", ")
            self.write("*")
            if node.vararg:
                self.write(node.vararg.arg)
                if node.vararg.annotation:
                    self.write(": ")
                    self.traverse(node.vararg.annotation)
        if node.kwonlyargs:
            for a, d in zip(node.kwonlyargs, node.kw_defaults):
                self.write(", ")
                self.traverse(a)
                if d:
                    self.write("=")
                    self.traverse(d)
        if node.kwarg:
            if first:
                first = False
            else:
                self.write(", ")
            self.write("**" + node.kwarg.arg)
            if node.kwarg.annotation:
                self.write(": ")
                self.traverse(node.kwarg.annotation)

    def visit_keyword(self, node):
        if node.arg is None:
            self.write("**")
        else:
            self.write(node.arg)
            self.write("=")
        self.traverse(node.value)

    def visit_Lambda(self, node):
        with self.require_parens(Precedence.TEST, node):
            self.write("lambda ")
            self.traverse(node.args)
            self.write(": ")
            self.set_preced(Precedence.TEST, node.body)
            self.traverse(node.body)

    def visit_alias(self, node):
        self.write(node.name)
        if node.asname:
            self.write(" as " + node.asname)

    def visit_withitem(self, node):
        self.traverse(node.context_expr)
        if node.optional_vars:
            self.write(" as ")
            self.traverse(node.optional_vars)


_INFSTR = "1e" + repr(sys.float_info.max_10_exp + 1)


class Precedence(IntEnum):
    TUPLE = auto()
    YIELD = auto()  # 'yield', 'yield from'
    TEST = auto()  # 'if'-'else', 'lambda'
    OR = auto()  # 'or'
    AND = auto()  # 'and'
    NOT = auto()  # 'not'
    CMP = auto()  # '<', '>', '==', '>=', '<=', '!=',
    # 'in', 'not in', 'is', 'is not'
    EXPR = auto()
    BOR = EXPR  # '|'
    BXOR = auto()  # '^'
    BAND = auto()  # '&'
    SHIFT = auto()  # '<<', '>>'
    ARITH = auto()  # '+', '-'
    TERM = auto()  # '*', '@', '/', '%', '//'
    FACTOR = auto()  # unary '+', '-', '~'
    POWER = auto()  # '**'
    AWAIT = auto()  # 'await'
    ATOM = auto()

    def next(self):
        try:
            return self.__class__(self + 1)
        except ValueError:
            return self


def unparse(ast_obj):
    unparser = Xformer()
    return unparser.visit(ast_obj)


def main():
    import argparse

    parser = argparse.ArgumentParser(prog="python -m ast")
    parser.add_argument(
        "infile",
        type=argparse.FileType(mode="rb"),
        nargs="?",
        default="-",
        help="the file to parse; defaults to stdin",
    )
    parser.add_argument(
        "-m",
        "--mode",
        default="exec",
        choices=("exec", "single", "eval", "func_type"),
        help="specify what kind of code must be parsed",
    )
    parser.add_argument(
        "--no-type-comments",
        default=True,
        action="store_false",
        help="don't add information about type comments",
    )
    parser.add_argument(
        "-a",
        "--include-attributes",
        action="store_true",
        help="include attributes such as line numbers and " "column offsets",
    )
    parser.add_argument(
        "-i",
        "--indent",
        type=int,
        default=3,
        help="indentation of nodes (number of spaces)",
    )
    args = parser.parse_args()

    with args.infile as infile:
        source = infile.read()
    tree = ast.parse(
        source, args.infile.name, args.mode, type_comments=args.no_type_comments
    )
    print(ast.dump(tree, include_attributes=args.include_attributes))


if __name__ == "__main__":
    main()
