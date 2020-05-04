import sys
import ast

from contextlib import contextmanager, nullcontext
from enum import IntEnum, auto


class Xformer(ast.NodeVisitor):
    def __init__(self):
        self._py = []
        self._ts = []
        self._buf = []
        self._preceds = {}
        self._indent = 0

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
            self.write(",", "")
        else:
            self.interleave(lambda: self.write(", "), traverser, xs)

    def maybe_newline(self):
        if self._py:
            self.write("\n")

    def fill(self, py="", ts=None):
        self.maybe_newline()
        self.write("    " * self._indent + py, py if ts is None else ts)

    def write(self, py, ts=None):
        self._py.append(py)
        self._ts.append(py if ts is None else ts)

    def buffer_writer(self, text):
        self._buf.append(text)

    @property
    def buffer(self):
        value = "".join(self._buf)
        self._buf.clear()
        return value

    @contextmanager
    def block(self):
        self.write(":", " {")
        self._indent += 1
        yield
        self._indent -= 1
        self.write("", "} ")

    @contextmanager
    def delimit(self, pys, pye, tss=None, tse=None):
        self.write(pys, pys if tss is None else tss)
        yield
        self.write(pye, pye if tse is None else tse)

    def delimit_if(self, start, end, condition):
        if condition:
            return self.delimit(start, end)
        else:
            return nullcontext()

    def require_parens(self, p, n):
        return self.delimit_if("(", ")", self.get_preced(n) > p)

    def get_preced(self, n):
        return self._preceds.get(n, Precedence.TEST)

    def set_preced(self, p, *ns):
        for n in ns:
            self._preceds[n] = p

    def get_raw_doc(self, node):
        if (
            not isinstance(
                node, (ast.AsyncFunctionDef, ast.FunctionDef, ast.ClassDef, ast.Module)
            )
            or len(node.body) < 1
        ):
            return None
        node = node.body[0]
        if not isinstance(node, ast.Expr):
            return None
        node = node.value
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            return node

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
            self.write(" := ", " = ")
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

    def visit_AugAssign(self, node):
        self.fill()
        self.traverse(node.target)
        self.write(" " + self.binop[node.op.__class__.__name__] + "= ")
        self.traverse(node.value)

    def visit_AnnAssign(self, node):
        self.fill()
        with self.delimit_if(
            "(", ")", not node.simple and isinstance(node.target, ast.Name)
        ):
            self.traverse(node.target)
        self.write(": ")
        self.traverse(node.annotation)
        if node.value:
            self.write(" = ")
            self.traverse(node.value)

    def visit_Return(self, n):
        self.fill("return")
        if n.value:
            self.write(" ")
            self.traverse(n.value)

    def visit_Pass(self, n):
        self.fill("pass", "")

    def visit_Break(self, n):
        self.fill("break")

    def visit_Continue(self, n):
        self.fill("continue")

    def visit_Delete(self, n):
        self.fill("del ", "delete ")
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
            self.write("yield from ", "yield* ")
            if not n.value:
                raise ValueError("Node can't be used without a value attribute.")
            self.set_preced(Precedence.ATOM, n.value)
            self.traverse(n.value)

    def visit_Raise(self, n):
        self.fill("raise", "throw")
        if not n.exc:
            if n.cause:
                raise ValueError("Node can't use cause without an exception.")
            return
        self.write(" ")
        self.traverse(n.exc)
        if n.cause:
            self.write(" from ", "")
            self.traverse(n.cause)

    def visit_Try(self, node):
        self.fill("try")
        with self.block():
            self.traverse(node.body)
        for ex in node.handlers:
            self.traverse(ex)
        if node.orelse:
            self.fill("else")
            with self.block():
                self.traverse(node.orelse)
        if node.finalbody:
            self.fill("finally")
            with self.block():
                self.traverse(node.finalbody)

    def visit_ExceptHandler(self, node):
        self.fill("except")
        if node.type:
            self.write(" ")
            self.traverse(node.type)
        if node.name:
            self.write(" as ")
            self.write(node.name)
        with self.block():
            self.traverse(node.body)

    def visit_ClassDef(self, node):
        self.maybe_newline()
        for deco in node.decorator_list:
            self.fill("@")
            self.traverse(deco)
        self.fill("class " + node.name)
        with self.delimit("(", ")"):
            comma = False
            for e in node.bases:
                if comma:
                    self.write(", ")
                else:
                    comma = True
                self.traverse(e)
            for e in node.keywords:
                if comma:
                    self.write(", ")
                else:
                    comma = True
                self.traverse(e)

        with self.block():
            self._write_doc_and_traverse(node)

    def visit_FunctionDef(self, node):
        self._function_helper(node, "def")

    def visit_AsyncFunctionDef(self, node):
        self._function_helper(node, "async def")

    def _function_helper(self, node, fill_suffix):
        self.maybe_newline()
        for deco in node.decorator_list:
            self.fill("@")
            self.traverse(deco)
        def_str = fill_suffix + " " + node.name
        self.fill(def_str)
        with self.delimit("(", ")"):
            self.traverse(node.args)
        if node.returns:
            self.write(" -> ")
            self.traverse(node.returns)
        with self.block():
            self._write_doc_and_traverse(node)

    def visit_For(self, n):
        self._for_helper("for ", "for (let ", n)

    def visit_AsyncFor(self, n):
        self._for_helper("async for ", "for (let ", n)

    def _for_helper(self, py, ts, n):
        self.fill(py, ts)
        self.traverse(n.target)
        self.write(" in ", " of ")
        self.traverse(n.iter)
        self.write("", ")")
        with self.block():
            self.traverse(n.body)
        if n.orelse:
            self.fill("else")
            with self.block():
                self.traverse(n.orelse)

    def visit_If(self, n):
        self.fill("if ", "if (")
        self.traverse(n.test)
        self.write("", ")")
        with self.block():
            self.traverse(n.body)
        while n.orelse and len(n.orelse) == 1 and isinstance(n.orelse[0], ast.If):
            n = n.orelse[0]
            self.fill("elif ", "else if (")
            self.traverse(n.test)
            self.write("", ")")
            with self.block():
                self.traverse(n.body)
        if n.orelse:
            self.fill("else")
            with self.block():
                self.traverse(n.orelse)

    def visit_While(self, n):
        self.fill("while ", "while (")
        self.traverse(n.test)
        self.write("", ")")
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

    def visit_Name(self, node):
        self.write(node.id)

    def _write_doc(self, n):
        self.fill()
        if n.kind == "u":
            self.write("u")
        v = n.value.replace("\\", "\\\\")
        v = v.replace('"""', '"""')
        if v[-1] == '"':
            v = v.replace('"', '\\"', -1)
        self.write(f'"""{v}"""', "")

    def _write_constant(self, value):
        if isinstance(value, (float, complex)):
            # Substitute overflowing decimal literal for AST infinities.
            self.write(repr(value).replace("inf", _INFSTR))
        else:
            self.write(repr(value))

    def visit_Constant(self, node):
        value = node.value
        if isinstance(value, tuple):
            with self.delimit("(", ")"):
                self.items_view(self._write_constant, value)
        elif value is ...:
            self.write("...")
        else:
            if node.kind == "u":
                self.write("u")
            self._write_constant(node.value)

    def visit_List(self, n):
        with self.delimit("[", "]"):
            self.interleave(lambda: self.write(", "), self.traverse, n.elts)

    def visit_ListComp(self, node):
        with self.delimit("[", "]"):
            self.traverse(node.elt)
            for gen in node.generators:
                self.traverse(gen)

    def visit_GeneratorExp(self, node):
        with self.delimit("(", ")"):
            self.traverse(node.elt)
            for gen in node.generators:
                self.traverse(gen)

    def visit_SetComp(self, node):
        with self.delimit("{", "}"):
            self.traverse(node.elt)
            for gen in node.generators:
                self.traverse(gen)

    def visit_DictComp(self, node):
        with self.delimit("{", "}"):
            self.traverse(node.key)
            self.write(": ")
            self.traverse(node.value)
            for gen in node.generators:
                self.traverse(gen)

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
            self.write(" if ")
            self.traverse(node.test)
            self.write(" else ")
            self.set_preced(Precedence.TEST, node.orelse)
            self.traverse(node.orelse)

    def visit_Set(self, node):
        if not node.elts:
            raise ValueError("Set node should have at least one item")
        with self.delimit("{", "}"):
            self.interleave(lambda: self.write(", "), self.traverse, node.elts)

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
        with self.delimit("(", ")", "[", "]"):
            self.items_view(self.traverse, n.elts)

    unop = {"Invert": "~", "Not": "not", "UAdd": "+", "USub": "-"}
    unop_precedence = {
        "~": Precedence.FACTOR,
        "not": Precedence.NOT,
        "+": Precedence.FACTOR,
        "-": Precedence.FACTOR,
    }

    def visit_UnaryOp(self, node):
        operator = self.unop[node.op.__class__.__name__]
        operator_precedence = self.unop_precedence[operator]
        with self.require_parens(operator_precedence, node):
            self.write(operator)
            self.write(" ")
            self.set_preced(operator_precedence, node.operand)
            self.traverse(node.operand)

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

    def visit_BinOp(self, node):
        operator = self.binop[node.op.__class__.__name__]
        operator_precedence = self.binop_precedence[operator]
        with self.require_parens(operator_precedence, node):
            if operator in self.binop_rassoc:
                left_precedence = operator_precedence.next()
                right_precedence = operator_precedence
            else:
                left_precedence = operator_precedence
                right_precedence = operator_precedence.next()

            self.set_preced(left_precedence, node.left)
            self.traverse(node.left)
            self.write(f" {operator} ")
            self.set_preced(right_precedence, node.right)
            self.traverse(node.right)

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

    def visit_BoolOp(self, node):
        operator = self.boolops[node.op.__class__.__name__]
        operator_precedence = self.boolop_precedence[operator]

        def increasing_level_traverse(node):
            nonlocal operator_precedence
            operator_precedence = operator_precedence.next()
            self.set_preced(operator_precedence, node)
            self.traverse(node)

        with self.require_parens(operator_precedence, node):
            s = f" {operator} "
            self.interleave(
                lambda: self.write(s), increasing_level_traverse, node.values
            )

    def visit_Attribute(self, node):
        self.set_preced(Precedence.ATOM, node.value)
        self.traverse(node.value)
        # Special case: 3.__abs__() is a syntax error, so if node.value
        # is an integer literal then we need to either parenthesize
        # it or add an extra space to get 3 .__abs__().
        if isinstance(node.value, ast.Constant) and isinstance(node.value.value, int):
            self.write(" ")
        self.write(".")
        self.write(node.attr)

    def visit_Call(self, node):
        self.set_preced(Precedence.ATOM, node.func)
        self.traverse(node.func)
        with self.delimit("(", ")"):
            comma = False
            for e in node.args:
                if comma:
                    self.write(", ")
                else:
                    comma = True
                self.traverse(e)
            for e in node.keywords:
                if comma:
                    self.write(", ")
                else:
                    comma = True
                self.traverse(e)

    def visit_Subscript(self, node):
        self.set_preced(Precedence.ATOM, node.value)
        self.traverse(node.value)
        with self.delimit("[", "]"):
            if isinstance(node.slice, ast.Tuple) and node.slice.elts:
                self.items_view(self.traverse, node.slice.elts)
            else:
                self.traverse(node.slice)

    def visit_Starred(self, node):
        self.write("*")
        self.set_preced(Precedence.EXPR, node.value)
        self.traverse(node.value)

    def visit_Ellipsis(self, node):
        self.write("...")

    def visit_Slice(self, node):
        if node.lower:
            self.traverse(node.lower)
        self.write(":")
        if node.upper:
            self.traverse(node.upper)
        if node.step:
            self.write(":")
            self.traverse(node.step)

    def visit_arg(self, node):
        self.write(node.arg)
        if node.annotation:
            self.write(": ")
            self.traverse(node.annotation)

    def visit_arguments(self, node):
        first = True
        # normal arguments
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

        # varargs, or bare '*' if no varargs but keyword-only arguments present
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

        # keyword-only arguments
        if node.kwonlyargs:
            for a, d in zip(node.kwonlyargs, node.kw_defaults):
                self.write(", ")
                self.traverse(a)
                if d:
                    self.write("=")
                    self.traverse(d)

        # kwargs
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
