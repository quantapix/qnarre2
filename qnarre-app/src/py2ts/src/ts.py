import re
import json
import inspect
import itertools


class CommentBlock(Node):
    def emit(self, text):
        assert text.find("*/") == -1
        yield from self.lines(delimited_multi(self, text, "/*", "*/", True))


class Literal(Node):
    def emit(self, text):
        yield from self.lines(delimited_multi(self, text, "", "", False))


class LFalse(Literal):
    def emit(self):
        yield self.part("false")


class Null(Literal):
    def emit(self):
        yield self.part("null")


class Num(Literal):
    def emit(self, x):
        yield self.part(str(x))


class Str(Literal):
    def emit(self, s):
        yield self.part(json.dumps(s))


class LTrue(Literal):
    def emit(self):
        yield self.part("true")


class Expression(Node):
    def emit(self, expr):
        yield self.part("(", expr, ")")


class AssignmentExpression(Node):
    def emit(self, left, right):
        yield self.part(left, " = ", right)


class IfExp(Node):
    def emit(self, test, body, orelse):
        yield self.part("(", test, " ? ", body, " : ", orelse, ")")


class Call(Node):

    operator = ""

    def emit(self, func, args, kw=None, operator=None):
        operator = operator or self.operator
        kw = kw or []
        r = [operator, func, "("]
        fargs = args.copy()
        if kw:
            fargs.append(kw)
        delimited(", ", fargs, r=r)
        r.append(")")
        yield self.part(*r)


class NewCall(Call):

    operator = "new "


class Attribute(Node):
    def emit(self, obj, s):
        assert re.search(r"^[a-zA-Z$_][a-zA-Z$_0-9]*$", s)
        check_keywords(self, s)
        yield self.part(obj, ".", s, name=True)


class Subscript(Node):
    def emit(self, obj, key):
        yield self.part(self.part(obj, name=True), "[", self.part(key, name=True), "]")


class KeySubscript(Node):
    def emit(self, key):
        yield self.part("[", self.part(key), "]")


class Operator(Node):
    pass


class LeftSideUnaryOp(Operator):
    pass


class OpIn(Operator):
    def emit(self):
        yield self.part("in")


class OpAnd(Operator):
    def emit(self):
        yield self.part("&&")


class OpOr(Operator):
    def emit(self):
        yield self.part("||")


class OpNot(LeftSideUnaryOp):
    def emit(self):
        yield self.part("!")


class OpInstanceof(Operator):
    def emit(self):
        yield self.part("instanceof")


class OpTypeof(LeftSideUnaryOp):
    def emit(self):
        yield self.part("typeof")


class OpAdd(Operator):
    def emit(self):
        yield self.part("+")


class OpSub(Operator):
    def emit(self):
        yield self.part("-")


class OpMult(Operator):
    def emit(self):
        yield self.part("*")


class OpDiv(Operator):
    def emit(self):
        yield self.part("/")


class OpMod(Operator):
    def emit(self):
        yield self.part("%")


class OpRShift(Operator):
    def emit(self):
        yield self.part(">>")


class OpLShift(Operator):
    def emit(self):
        yield self.part("<<")


class OpBitXor(Operator):
    def emit(self):
        yield self.part("^")


class OpBitAnd(Operator):
    def emit(self):
        yield self.part("&")


class OpBitOr(Operator):
    def emit(self):
        yield self.part("|")


class OpInvert(LeftSideUnaryOp):
    def emit(self):
        yield self.part("~")


class OpUSub(LeftSideUnaryOp):
    def emit(self):
        yield self.part("-")


class OpStrongEq(Operator):
    def emit(self):
        yield self.part("===")


class OpStrongNotEq(Operator):
    def emit(self):
        yield self.part("!==")


class OpLt(Operator):
    def emit(self):
        yield self.part("<")


class OpLtE(Operator):
    def emit(self):
        yield self.part("<=")


class OpGt(Operator):
    def emit(self):
        yield self.part(">")


class OpGtE(Operator):
    def emit(self):
        yield self.part(">=")


Is = OpStrongEq


class Rest(Operator):
    def emit(self, value):
        yield self.part("...", value)


class UnaryOp(Node):
    def emit(self, op, right):
        assert isinstance(op, LeftSideUnaryOp)
        yield self.part("(", op, " ", right, ")")


class BinOp(Node):
    def emit(self, left, op, right):
        yield self.part("(", left, " ", op, " ", right, ")")


class MultipleArgsOp(Node):
    def emit(self, binop, conj, *args):
        assert len(args) > 1
        parts = []
        for ix, arg in enumerate(args):
            if isinstance(binop, (tuple, list)):
                op = binop[ix]
            else:
                op = binop
            if ix > 0:
                parts += [" ", conj, " "]
            parts += ["(", arg[0], " ", op, " ", arg[1], ")"]
        yield self.part("(", *parts, ")")


class Name(Node):
    def emit(self, name):
        check_keywords(self, name)
        yield self.part(name, name=True)


class TaggedTemplate(Node):
    def emit(self, value, func):
        text = list(delimited_multi(self, value, "`"))
        func = list(func.serialize())
        yield self.part(*func, *text)


class TemplateLiteral(Node):
    def emit(self, value):
        yield from delimited_multi(self, value, "`")


class Super(Node):
    def emit(self):
        yield self.part("super")


class This(Node):
    def emit(self):
        yield self.part("this")


class Statement(Node):
    pass


class Statements(Node):
    def __iadd__(self, other):
        self.xargs.extend(other.xargs)
        return self

    def emit(self, statements):
        for s in statements:
            yield s

    def squash(self, args):
        for a in args:
            if isinstance(a, Statements):
                yield from a.xargs
            else:
                yield a

    def reordered_args(self, args):
        args = list(self.squash(args))
        imports = []
        vars_ = []
        others = []
        for a in args:
            if isinstance(a, Import):
                imports.append(a)
            elif isinstance(a, VarStatement) and not a.options.get("unmovable", False):
                vars_.append(a)
            else:
                others.append(a)
        others_first = []
        others_after = []
        start_trigger = False
        for s in others:
            if isinstance(s, CommentBlock) and not start_trigger:
                others_first.append(s)
            else:
                others_after.append(s)
                start_trigger = True
        return itertools.chain(others_first, imports, vars_, others_after)

    def serialize(self):
        for a in self.emit(self.reordered_args(self.xargs)):
            yield from self.lines(a.serialize(), delim=True)


class VarDeclarer(Statement):
    def with_kind(self, kind, keys, values):
        for key in keys:
            check_keywords(self, key)
        assert len(keys) > 0
        assert len(keys) == len(values)

        arr = ["%s " % kind]
        for i in range(len(keys)):
            if i > 0:
                arr.append(", ")
            arr.append(keys[i])
            if values[i] is not None:
                arr.append(" = ")
                arr.append(values[i])
        yield self.part(*arr)


class VarStatement(VarDeclarer):
    def emit(self, keys, values, unmovable=False):
        yield from self.with_kind("var", keys, values)


class LetStatement(VarDeclarer):
    def emit(self, keys, values, unmovable=True):
        yield from self.with_kind("let", keys, values)


class AugAssignStatement(Statement):
    def emit(self, t, op, v):
        yield self.part(t, " ", op, "= ", v, name=str(t))


class Import(Statement):
    pass


class DependImport(Import):
    def emit(self, module):
        yield self.line(["System.import(", "'", module, "'", ")"], delim=True)


class NamedImport(Import):
    def emit(self, module, names):
        js_names = []
        for name, alias in sorted(names):
            if alias:
                js_names.append(self.part(name, " as ", alias))
            else:
                js_names.append(self.part(name))

        yield self.line(
            ["import {", *delimited(", ", js_names), "} from '", module, "'"],
            delim=True,
        )


class StarImport(Import):
    def emit(self, module, name):
        yield self.line(["import * as ", name, " from '", module, "'"], delim=True)


class DefaultImport(Import):
    def emit(self, module, alias):
        yield self.line(["import ", alias, " from '", module, "'"], delim=True)


class Export(Statement):
    def emit(self, names):
        yield self.line(["export ", "{", *delimited(", ", names), "}"], delim=True)


class ExportDefault(Export):
    def emit(self, name):
        yield self.line(["export default ", name], delim=True)


class ExpressionStatement(Statement):
    def emit(self, value):
        yield self.part(value)


class TryCatchFinallyStatement(Block):
    def emit(self, try_body, target, catch_body, finally_body):
        assert catch_body or finally_body
        yield self.line("try {")
        yield from self.lines(try_body, indent=True, delim=True)
        if catch_body:
            yield self.line(["} catch(", target, ") {"])
            yield from self.lines(catch_body, indent=True, delim=True)
        if finally_body:
            yield self.line(["} finally {"])
            yield from self.lines(finally_body, indent=True, delim=True)
        yield self.line("}")


class Function(Block):

    begin = "function "
    bet_args_n_body = ""

    def fargs(self, args, acc=None, kw=None):
        r = ["("]
        js_args = args.copy()
        if kw:
            js_args.append(self.part("{", *delimited(", ", kw), "}={}"))
        if acc:
            js_args.append(acc)
        delimited(", ", js_args, r=r)
        r.append(") ")
        return r

    def emit(self, name, args, body, acc=None, kw=None):
        line = [self.begin]
        if name is not None:
            line.append(name)
        line += self.fargs(args, acc, kw)
        line += self.bet_args_n_body
        line += ["{"]
        yield self.line(line, name=str(name))
        yield from self.lines(body, indent=True, delim=True)
        yield self.line("}")


class AsyncFunction(Function):

    begin = "async function "


class GenFunction(Function):

    begin = "function* "


class ArrowFunction(Function):

    begin = ""
    bet_args_n_body = "=> "

    def emit(self, name, args, body, acc=None, kw=None):
        if name:
            # TODO: split this into an assignment + arrow function
            line = [name, " = "]
        else:
            line = []
        line += self.fargs(args, acc, kw)
        line += self.bet_args_n_body
        line += ["{"]
        yield self.line(line)
        yield from self.lines(body, indent=True, delim=True)
        if name:
            yield self.line("}", delim=True)
        else:
            yield self.part("}")


class Class(Block):
    def emit(self, name, super_, methods):
        line = ["class ", name]
        if super_ is not None:
            line += [" extends ", super_]
        line += [" {"]
        yield self.line(line)
        yield from self.lines(methods, indent=True, delim=True)
        yield self.line("}")


class ClassMember(Function):
    def with_kind(self, kind, args, body, acc=None, kw=None, static=False):
        if static:
            line = ["static ", kind]
        else:
            line = [kind]
        line += self.fargs(args, acc, kw)
        line += ["{"]
        yield self.line(line)
        yield from self.lines(body, indent=True, delim=True)
        yield self.line("}")


class ClassConstructor(ClassMember):
    def emit(self, args, body, acc=None, kw=None):
        yield from self.with_kind("constructor", args, body, acc, kw)


class Method(ClassMember):
    def emit(self, name, args, body, acc=None, kw=None, static=False):
        yield from self.with_kind(name, args, body, acc, kw, static)


class AsyncMethod(ClassMember):
    def emit(self, name, args, body, acc=None, kw=None, static=False):
        yield from self.with_kind("async " + name, args, body, acc, kw, static)


class GenMethod(ClassMember):
    def emit(self, name, args, body, acc=None, kw=None, static=False):
        yield from self.with_kind("* " + name, args, body, acc, kw, static)


class Getter(ClassMember):
    def emit(self, name, body, static=False):
        yield from self.with_kind("get " + name, [], body, static=static)


class Setter(ClassMember):
    def emit(self, name, arg, body, static=False):
        yield from self.with_kind("set " + name, [arg], body, static=static)


KEYWORDS = set(
    [
        "break",
        "case",
        "catch",
        "continue",
        "default",
        "delete",
        "do",
        "else",
        "finally",
        "for",
        "function",
        "if",
        "in",
        "instanceof",
        "new",
        "return",
        "switch",
        "this",
        "throw",
        "try",
        "typeof",
        "var",
        "void",
        "while",
        "with",
        "abstract",
        "boolean",
        "byte",
        "char",
        "class",
        "const",
        "double",
        "enum",
        "export",
        "extends",
        "final",
        "float",
        "goto",
        "implements",
        "import",
        "int",
        "interface",
        "long",
        "native",
        "package",
        "private",
        "protected",
        "public",
        "short",
        "static",
        "super",
        "synchronized",
        "throws",
        "transient",
        "volatile",
    ]
)


def check_keywords(t, n):
    x = t.xform
    if x is not None:
        x.unsupported(
            t.py,
            (n in KEYWORDS - set(["delete"])),
            f"Name '{n}' is reserved in TypeScript",
        )
    else:
        if n in KEYWORDS:
            raise ValueError(f"Name '{n}' is reserved in TypeScript")
