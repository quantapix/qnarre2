import re
import json
import inspect
import itertools


class Output:
    def __init__(self, node):
        self.node = node

    def serialize(self):
        yield self


class Line(Output):
    def __init__(self, node, item, indent=False, delim=False):
        super().__init__(node)
        self.indent = int(indent)
        self.delim = delim
        if isinstance(item, (tuple, list)):
            item = Part(node, *item)
        self.item = item

    def __str__(self):
        line = str(self.item)
        if self.delim:
            line += ';'
        if self.indent and line.strip():
            line = (' ' * 4 * self.indent) + line
        line += '\n'
        return line

    def __repr__(self):
        return '<%s indent: %d, "%s">' % (self.__class__.__name__, self.indent,
                                          str(self))


class Part(Output):
    def __init__(self, node, *items):
        super().__init__(node)
        self.items = []
        for i in items:
            if isinstance(i, (str, Part)):
                self.items.append(i)
            elif inspect.isgenerator(i):
                self.items.extend(i)
            else:
                self.items.append(str(i))

    def __str__(self):
        return ''.join(str(i) for i in self.items)

    def __repr__(self):
        return '<%s, "%s">' % (self.__class__.__name__, str(self))


class Code(Output):
    def __init__(self, node):
        super().__init__(None)
        self.lines = list(node.serialize())

    def read(self):
        return ''.join(str(l) for l in self.lines)


class Target:
    ast = None
    xform = None
    xargs = None

    def __init__(self, *args, **kw):
        self.args = args
        self.kw = kw

    def __str__(self):
        return ''.join(str(x) for x in self.serialize())

    def _chain(self, items):
        for i in self._expand(items):
            if inspect.isgenerator(i):
                yield from i
            else:
                yield i

    def _expand(self, items):
        for i in items:
            if isinstance(i, Target):
                yield from i.serialize()
            else:
                yield i

    def emit(self):
        pass  # ...

    @classmethod
    def final(cls, *xargs, **kw):
        tn = cls(**kw)
        tn.xargs = xargs
        return tn

    def line(self, item, indent=False, delim=False, name=None):
        if isinstance(item, Line):
            item.indent += int(indent)
            return item
        elif isinstance(item, (tuple, list)):
            item = tuple(self._chain(item))
            return Line(self, item, indent, delim, name)
        return Line(self, item, indent, delim, name)

    def lines(self, items, *, indent=False, delim=False, name=None):
        if not isinstance(items, (tuple, list)):
            items = (items, )
        for i in self._chain(items):
            yield self.line(i, indent=indent, delim=delim, name=name)

    def part(self, *items, name=None):
        it = tuple(self._expand(items))
        if len(it) == 1 and isinstance(it[0], Line):
            result = it[0].item
        else:
            result = Part(self, *it, name=name)
        return result

    def serialize(self):
        for a in self.emit(*self.xargs, **self.kw):
            yield from a.serialize()


def delimited(delim, arr, dest=None, at_end=False):
    if dest is None:
        dest = []
    if arr:
        dest.append(arr[0])
    for i in range(1, len(arr)):
        dest.append(delim)
        dest.append(arr[i])
    if at_end:
        dest.append(delim)
    return dest


def delimited_multi(node, text, begin=None, end=None, add_space=False):
    begin = begin or ''
    end = end or ''
    if begin and not end:
        end = begin
    sp = ' ' if add_space else ''
    lines = text.splitlines()
    if len(lines) > 1:
        yield node.line(node.part(begin, lines[0].strip()))
        for l in lines[1:-1]:
            yield node.line(l.strip())
        yield node.line(node.part(lines[-1].strip(), end))
    else:
        yield node.part(begin, sp, text, sp, end)


class Node(Target):
    pass


class Pass(Node):
    def emit(self):
        return []


class CommentBlock(Node):
    def emit(self, text):
        assert text.find('*/') == -1
        yield from self.lines(delimited_multi(self, text, '/*', '*/', True))


class Literal(Node):
    def emit(self, text):
        yield from self.lines(delimited_multi(self, text, '', '', False))


class Dict(Literal):
    def emit(self, keys, values):
        arr = ['{']
        for i in range(len(keys)):
            if i > 0:
                arr.append(', ')
            arr.append(keys[i])
            arr.append(': ')
            arr.append(values[i])
        arr.append('}')
        yield self.part(*arr)


class List(Literal):
    def emit(self, elts):
        arr = ['[']
        delimited(', ', elts, dest=arr)
        arr.append(']')
        yield self.part(*arr)


class LFalse(Literal):
    def emit(self):
        yield self.part('false')


class Null(Literal):
    def emit(self):
        yield self.part('null')


class Num(Literal):
    def emit(self, x):
        yield self.part(str(x))


class Str(Literal):
    def emit(self, s):
        yield self.part(json.dumps(s))


class LTrue(Literal):
    def emit(self):
        yield self.part('true')


class Expression(Node):
    def emit(self, expr):
        yield self.part('(', expr, ')')


class AssignmentExpression(Node):
    def emit(self, left, right):
        yield self.part(left, ' = ', right)


class IfExp(Node):
    def emit(self, test, body, orelse):
        yield self.part('(', test, ' ? ', body, ' : ', orelse, ')')


class Call(Node):

    operator = ''

    def emit(self, func, args, kw=None, operator=None):
        operator = operator or self.operator
        kw = kw or []
        arr = [operator, func, '(']
        fargs = args.copy()
        if kw:
            fargs.append(kw)
        delimited(', ', fargs, dest=arr)
        arr.append(')')
        yield self.part(*arr)


class NewCall(Call):

    operator = 'new '


class Attribute(Node):
    def emit(self, obj, s):
        assert re.search(r'^[a-zA-Z$_][a-zA-Z$_0-9]*$', s)
        check_keywords(self, s)
        yield self.part(obj, '.', s, name=True)


class Subscript(Node):
    def emit(self, obj, key):
        yield self.part(self.part(obj, name=True), '[',
                        self.part(key, name=True), ']')


class KeySubscript(Node):
    def emit(self, key):
        yield self.part('[', self.part(key), ']')


class Operator(Node):
    pass


class LeftSideUnaryOp(Operator):
    pass


class OpIn(Operator):
    def emit(self):
        yield self.part('in')


class OpAnd(Operator):
    def emit(self):
        yield self.part('&&')


class OpOr(Operator):
    def emit(self):
        yield self.part('||')


class OpNot(LeftSideUnaryOp):
    def emit(self):
        yield self.part('!')


class OpInstanceof(Operator):
    def emit(self):
        yield self.part('instanceof')


class OpTypeof(LeftSideUnaryOp):
    def emit(self):
        yield self.part('typeof')


class OpAdd(Operator):
    def emit(self):
        yield self.part('+')


class OpSub(Operator):
    def emit(self):
        yield self.part('-')


class OpMult(Operator):
    def emit(self):
        yield self.part('*')


class OpDiv(Operator):
    def emit(self):
        yield self.part('/')


class OpMod(Operator):
    def emit(self):
        yield self.part('%')


class OpRShift(Operator):
    def emit(self):
        yield self.part('>>')


class OpLShift(Operator):
    def emit(self):
        yield self.part('<<')


class OpBitXor(Operator):
    def emit(self):
        yield self.part('^')


class OpBitAnd(Operator):
    def emit(self):
        yield self.part('&')


class OpBitOr(Operator):
    def emit(self):
        yield self.part('|')


class OpInvert(LeftSideUnaryOp):
    def emit(self):
        yield self.part('~')


class OpUSub(LeftSideUnaryOp):
    def emit(self):
        yield self.part('-')


class OpStrongEq(Operator):
    def emit(self):
        yield self.part('===')


class OpStrongNotEq(Operator):
    def emit(self):
        yield self.part('!==')


class OpLt(Operator):
    def emit(self):
        yield self.part('<')


class OpLtE(Operator):
    def emit(self):
        yield self.part('<=')


class OpGt(Operator):
    def emit(self):
        yield self.part('>')


class OpGtE(Operator):
    def emit(self):
        yield self.part('>=')


Is = OpStrongEq


class Rest(Operator):
    def emit(self, value):
        yield self.part('...', value)


class UnaryOp(Node):
    def emit(self, op, right):
        assert isinstance(op, LeftSideUnaryOp)
        yield self.part('(', op, ' ', right, ')')


class BinOp(Node):
    def emit(self, left, op, right):
        yield self.part('(', left, ' ', op, ' ', right, ')')


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
                parts += [' ', conj, ' ']
            parts += ['(', arg[0], ' ', op, ' ', arg[1], ')']
        yield self.part('(', *parts, ')')


class Name(Node):
    def emit(self, name):
        check_keywords(self, name)
        yield self.part(name, name=True)


class TaggedTemplate(Node):
    def emit(self, value, func):
        text = list(delimited_multi(self, value, '`'))
        func = list(func.serialize())
        yield self.part(*func, *text)


class TemplateLiteral(Node):
    def emit(self, value):
        yield from delimited_multi(self, value, '`')


class Super(Node):
    def emit(self):
        yield self.part('super')


class This(Node):
    def emit(self):
        yield self.part('this')


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
            elif isinstance(
                    a, VarStatement) and not a.options.get('unmovable', False):
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

        arr = ['%s ' % kind]
        for i in range(len(keys)):
            if i > 0:
                arr.append(', ')
            arr.append(keys[i])
            if values[i] is not None:
                arr.append(' = ')
                arr.append(values[i])
        yield self.part(*arr)


class VarStatement(VarDeclarer):
    def emit(self, keys, values, unmovable=False):
        yield from self.with_kind('var', keys, values)


class LetStatement(VarDeclarer):
    def emit(self, keys, values, unmovable=True):
        yield from self.with_kind('let', keys, values)


class AugAssignStatement(Statement):
    def emit(self, target, op, value):
        yield self.part(target, ' ', op, '= ', value, name=str(target))


class ReturnStatement(Statement):
    def emit(self, value):
        if value:
            result = self.line(['return ', value], delim=True)
        else:
            result = self.line('return', delim=True)
        yield result


class BreakStatement(Statement):
    def emit(self):
        yield self.part('break')


class ContinueStatement(Statement):
    def emit(self):
        yield self.part('continue')


class DeleteStatement(Statement):
    def emit(self, value):
        yield self.line(['delete ', value], delim=True)


class ThrowStatement(Statement):
    def emit(self, obj):
        yield self.line(['throw ', obj], delim=True)


class Yield(Statement):
    def emit(self, expr):
        yield self.part('yield ', expr)


class YieldStar(Statement):
    def emit(self, expr):
        yield self.part('yield* ', expr)


class Await(Statement):
    def emit(self, value):
        yield self.part('await ', value)


class Import(Statement):
    pass


class DependImport(Import):
    def emit(self, module):
        yield self.line(['System.import(', "'", module, "'", ')'], delim=True)


class NamedImport(Import):
    def emit(self, module, names):
        js_names = []
        for name, alias in sorted(names):
            if alias:
                js_names.append(self.part(name, ' as ', alias))
            else:
                js_names.append(self.part(name))

        yield self.line(
            ['import {', *delimited(', ', js_names), "} from '", module, "'"],
            delim=True)


class StarImport(Import):
    def emit(self, module, name):
        yield self.line(['import * as ', name, " from '", module, "'"],
                        delim=True)


class DefaultImport(Import):
    def emit(self, module, alias):
        yield self.line(['import ', alias, " from '", module, "'"], delim=True)


class Export(Statement):
    def emit(self, names):
        yield self.line(['export ', '{', *delimited(', ', names), '}'],
                        delim=True)


class ExportDefault(Export):
    def emit(self, name):
        yield self.line(['export default ', name], delim=True)


class ExpressionStatement(Statement):
    def emit(self, value):
        yield self.part(value)


class Block(Statement):
    pass


class IfStatement(Block):
    def emit(self, test, body, orelse):
        yield self.line(['if (', test, ') {'])
        yield from self.lines(body, indent=True, delim=True)
        if orelse:
            yield self.line(['} else {'])
            yield from self.lines(orelse, indent=True, delim=True)
            yield self.line('}')
        else:
            yield self.line('}')


class WhileStatement(Block):
    def emit(self, test, body):
        yield self.line(['while (', test, ') {'])
        yield from self.lines(body, indent=True, delim=True)
        yield self.line('}')


class ForStatement(Block):
    def emit(self, left, test, right, body):
        yield self.line(['for (', left, '; ', test, '; ', right, ') {'])
        yield from self.lines(body, indent=True, delim=True)
        yield self.line('}')


class ForIterableStatement(Block):

    operator = ' of '

    def emit(self, target, source, body):
        yield self.line(
            ['for (var ',
             self.part(target), self.operator, source, ') {'])
        yield from self.lines(body, indent=True, delim=True)
        yield self.line('}')


class ForeachStatement(ForIterableStatement):

    operator = ' in '


class ForofStatement(ForIterableStatement):
    pass


class TryCatchFinallyStatement(Block):
    def emit(self, try_body, target, catch_body, finally_body):
        assert catch_body or finally_body
        yield self.line('try {')
        yield from self.lines(try_body, indent=True, delim=True)
        if catch_body:
            yield self.line(['} catch(', target, ') {'])
            yield from self.lines(catch_body, indent=True, delim=True)
        if finally_body:
            yield self.line(['} finally {'])
            yield from self.lines(finally_body, indent=True, delim=True)
        yield self.line('}')


class Function(Block):

    begin = 'function '
    bet_args_n_body = ''

    def fargs(self, args, acc=None, kw=None):
        result = []
        result.append('(')
        js_args = args.copy()
        if kw:
            js_args.append(self.part('{', *delimited(', ', kw), '}={}'))
        if acc:
            js_args.append(acc)
        delimited(', ', js_args, dest=result)
        result.append(') ')
        return result

    def emit(self, name, args, body, acc=None, kw=None):
        line = [self.begin]
        if name is not None:
            line.append(name)
        line += self.fargs(args, acc, kw)
        line += self.bet_args_n_body
        line += ['{']
        yield self.line(line, name=str(name))
        yield from self.lines(body, indent=True, delim=True)
        yield self.line('}')


class AsyncFunction(Function):

    begin = 'async function '


class GenFunction(Function):

    begin = 'function* '


class ArrowFunction(Function):

    begin = ''
    bet_args_n_body = '=> '

    def emit(self, name, args, body, acc=None, kw=None):
        if name:
            # TODO: split this into an assignment + arrow function
            line = [name, ' = ']
        else:
            line = []
        line += self.fargs(args, acc, kw)
        line += self.bet_args_n_body
        line += ['{']
        yield self.line(line)
        yield from self.lines(body, indent=True, delim=True)
        if name:
            yield self.line('}', delim=True)
        else:
            yield self.part('}')


class Class(Block):
    def emit(self, name, super_, methods):
        line = ['class ', name]
        if super_ is not None:
            line += [' extends ', super_]
        line += [' {']
        yield self.line(line)
        yield from self.lines(methods, indent=True, delim=True)
        yield self.line('}')


class ClassMember(Function):
    def with_kind(self, kind, args, body, acc=None, kw=None, static=False):
        if static:
            line = ['static ', kind]
        else:
            line = [kind]
        line += self.fargs(args, acc, kw)
        line += ['{']
        yield self.line(line)
        yield from self.lines(body, indent=True, delim=True)
        yield self.line('}')


class ClassConstructor(ClassMember):
    def emit(self, args, body, acc=None, kw=None):
        yield from self.with_kind('constructor', args, body, acc, kw)


class Method(ClassMember):
    def emit(self, name, args, body, acc=None, kw=None, static=False):
        yield from self.with_kind(name, args, body, acc, kw, static)


class AsyncMethod(ClassMember):
    def emit(self, name, args, body, acc=None, kw=None, static=False):
        yield from self.with_kind('async ' + name, args, body, acc, kw, static)


class GenMethod(ClassMember):
    def emit(self, name, args, body, acc=None, kw=None, static=False):
        yield from self.with_kind('* ' + name, args, body, acc, kw, static)


class Getter(ClassMember):
    def emit(self, name, body, static=False):
        yield from self.with_kind('get ' + name, [], body, static=static)


class Setter(ClassMember):
    def emit(self, name, arg, body, static=False):
        yield from self.with_kind('set ' + name, [arg], body, static=static)


KEYWORDS = set([
    'break', 'case', 'catch', 'continue', 'default', 'delete', 'do', 'else',
    'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
    'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with',
    'abstract', 'boolean', 'byte', 'char', 'class', 'const', 'double', 'enum',
    'export', 'extends', 'final', 'float', 'goto', 'implements', 'import',
    'int', 'interface', 'long', 'native', 'package', 'private', 'protected',
    'public', 'short', 'static', 'super', 'synchronized', 'throws',
    'transient', 'volatile'
])


def check_keywords(t, n):
    x = t.xform
    if x is not None:
        x.unsupported(t.ast, (n in KEYWORDS - set(['delete'])),
                      f"Name '{n}' is reserved in TypeScript")
    else:
        if n in KEYWORDS:
            raise ValueError(f"Name '{n}' is reserved in TypeScript")
