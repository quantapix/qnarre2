import re
import json
import inspect
import itertools

from .processor.util import Line, Part
from .processor.util import delimited, delimited_multi_line


class Target:
    ast = None
    transformer = None
    transformed_args = None

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
    def final(cls, *transformed_args, **kw):
        tn = cls(**kw)
        tn.transformed_args = transformed_args
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
        for a in self.emit(*self.transformed_args, **self.kw):
            yield from a.serialize()


class TSNode(Target):
    pass


class TSPass(TSNode):
    def emit(self):
        return []


class TSCommentBlock(TSNode):
    def emit(self, text):
        assert text.find('*/') == -1
        yield from self.lines(
            delimited_multi_line(self, text, '/*', '*/', True))


class TSLiteral(TSNode):
    def emit(self, text):
        yield from self.lines(delimited_multi_line(self, text, '', '', False))


class TSDict(TSLiteral):
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


class TSList(TSLiteral):
    def emit(self, elts):
        arr = ['[']
        delimited(', ', elts, dest=arr)
        arr.append(']')
        yield self.part(*arr)


class TSFalse(TSLiteral):
    def emit(self):
        yield self.part('false')


class TSNull(TSLiteral):
    def emit(self):
        yield self.part('null')


class TSNum(TSLiteral):
    def emit(self, x):
        yield self.part(str(x))


class TSStr(TSLiteral):
    def emit(self, s):
        yield self.part(json.dumps(s))


class TSTrue(TSLiteral):
    def emit(self):
        yield self.part('true')


class TSExpression(TSNode):
    def emit(self, expr):
        yield self.part('(', expr, ')')


class TSAssignmentExpression(TSNode):
    def emit(self, left, right):
        yield self.part(left, ' = ', right)


class TSIfExp(TSNode):
    def emit(self, test, body, orelse):
        yield self.part('(', test, ' ? ', body, ' : ', orelse, ')')


class TSCall(TSNode):

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


class TSNewCall(TSCall):

    operator = 'new '


class TSAttribute(TSNode):
    def emit(self, obj, s):
        assert re.search(r'^[a-zA-Z$_][a-zA-Z$_0-9]*$', s)
        _check_keywords(self, s)
        yield self.part(obj, '.', s, name=True)


class TSSubscript(TSNode):
    def emit(self, obj, key):
        yield self.part(self.part(obj, name=True), '[',
                        self.part(key, name=True), ']')


class TSKeySubscript(TSNode):
    def emit(self, key):
        yield self.part('[', self.part(key), ']')


class TSOperator(TSNode):
    pass


class TSLeftSideUnaryOp(TSOperator):
    pass


class TSOpIn(TSOperator):
    def emit(self):
        yield self.part('in')


class TSOpAnd(TSOperator):
    def emit(self):
        yield self.part('&&')


class TSOpOr(TSOperator):
    def emit(self):
        yield self.part('||')


class TSOpNot(TSLeftSideUnaryOp):
    def emit(self):
        yield self.part('!')


class TSOpInstanceof(TSOperator):
    def emit(self):
        yield self.part('instanceof')


class TSOpTypeof(TSLeftSideUnaryOp):
    def emit(self):
        yield self.part('typeof')


class TSOpAdd(TSOperator):
    def emit(self):
        yield self.part('+')


class TSOpSub(TSOperator):
    def emit(self):
        yield self.part('-')


class TSOpMult(TSOperator):
    def emit(self):
        yield self.part('*')


class TSOpDiv(TSOperator):
    def emit(self):
        yield self.part('/')


class TSOpMod(TSOperator):
    def emit(self):
        yield self.part('%')


class TSOpRShift(TSOperator):
    def emit(self):
        yield self.part('>>')


class TSOpLShift(TSOperator):
    def emit(self):
        yield self.part('<<')


class TSOpBitXor(TSOperator):
    def emit(self):
        yield self.part('^')


class TSOpBitAnd(TSOperator):
    def emit(self):
        yield self.part('&')


class TSOpBitOr(TSOperator):
    def emit(self):
        yield self.part('|')


class TSOpInvert(TSLeftSideUnaryOp):
    def emit(self):
        yield self.part('~')


class TSOpUSub(TSLeftSideUnaryOp):
    def emit(self):
        yield self.part('-')


class TSOpStrongEq(TSOperator):
    def emit(self):
        yield self.part('===')


class TSOpStrongNotEq(TSOperator):
    def emit(self):
        yield self.part('!==')


class TSOpLt(TSOperator):
    def emit(self):
        yield self.part('<')


class TSOpLtE(TSOperator):
    def emit(self):
        yield self.part('<=')


class TSOpGt(TSOperator):
    def emit(self):
        yield self.part('>')


class TSOpGtE(TSOperator):
    def emit(self):
        yield self.part('>=')


TSIs = TSOpStrongEq


class TSRest(TSOperator):
    def emit(self, value):
        yield self.part('...', value)


class TSUnaryOp(TSNode):
    def emit(self, op, right):
        assert isinstance(op, TSLeftSideUnaryOp)
        yield self.part('(', op, ' ', right, ')')


class TSBinOp(TSNode):
    def emit(self, left, op, right):
        yield self.part('(', left, ' ', op, ' ', right, ')')


class TSMultipleArgsOp(TSNode):
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


class TSName(TSNode):
    def emit(self, name):
        _check_keywords(self, name)
        yield self.part(name, name=True)


class TSTaggedTemplate(TSNode):
    def emit(self, value, func):
        text = list(delimited_multi_line(self, value, '`'))
        func = list(func.serialize())
        yield self.part(*func, *text)


class TSTemplateLiteral(TSNode):
    def emit(self, value):
        yield from delimited_multi_line(self, value, '`')


class TSSuper(TSNode):
    def emit(self):
        yield self.part('super')


class TSThis(TSNode):
    def emit(self):
        yield self.part('this')


class TSStatement(TSNode):
    pass


class TSStatements(TSNode):
    def __iadd__(self, other):
        self.transformed_args.extend(other.transformed_args)
        return self

    def emit(self, statements):
        for s in statements:
            yield s

    def squash(self, args):
        for a in args:
            if isinstance(a, TSStatements):
                yield from a.transformed_args
            else:
                yield a

    def reordered_args(self, args):
        """Reorder the args to keep the imports and vars always at the top."""
        args = list(self.squash(args))
        imports = []
        vars_ = []
        others = []
        for a in args:
            if isinstance(a, TSImport):
                imports.append(a)
            elif isinstance(a, TSVarStatement) and not a.options.get(
                    'unmovable', False):
                vars_.append(a)
            else:
                others.append(a)

        others_first = []
        others_after = []
        # if the others start with some comments, put those at the top
        start_trigger = False
        for s in others:
            if isinstance(s, TSCommentBlock) and not start_trigger:
                others_first.append(s)
            else:
                others_after.append(s)
                start_trigger = True

        return itertools.chain(others_first, imports, vars_, others_after)

    def serialize(self):
        for a in self.emit(self.reordered_args(self.transformed_args)):
            yield from self.lines(a.serialize(), delim=True)


class TSVarDeclarer(TSStatement):
    def with_kind(self, kind, keys, values):
        for key in keys:
            _check_keywords(self, key)
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


class TSVarStatement(TSVarDeclarer):
    def emit(self, keys, values, unmovable=False):
        yield from self.with_kind('var', keys, values)


class TSLetStatement(TSVarDeclarer):
    def emit(self, keys, values, unmovable=True):
        yield from self.with_kind('let', keys, values)


class TSAugAssignStatement(TSStatement):
    def emit(self, target, op, value):
        yield self.part(target, ' ', op, '= ', value, name=str(target))


class TSReturnStatement(TSStatement):
    def emit(self, value):
        if value:
            result = self.line(['return ', value], delim=True)
        else:
            result = self.line('return', delim=True)
        yield result


class TSBreakStatement(TSStatement):
    def emit(self):
        yield self.part('break')


class TSContinueStatement(TSStatement):
    def emit(self):
        yield self.part('continue')


class TSDeleteStatement(TSStatement):
    def emit(self, value):
        yield self.line(['delete ', value], delim=True)


class TSThrowStatement(TSStatement):
    def emit(self, obj):
        yield self.line(['throw ', obj], delim=True)


class TSYield(TSStatement):
    def emit(self, expr):
        yield self.part('yield ', expr)


class TSYieldStar(TSStatement):
    def emit(self, expr):
        yield self.part('yield* ', expr)


class TSAwait(TSStatement):
    def emit(self, value):
        yield self.part('await ', value)


class TSImport(TSStatement):
    pass


class TSDependImport(TSImport):
    def emit(self, module):
        yield self.line(['System.import(', "'", module, "'", ')'], delim=True)


class TSNamedImport(TSImport):
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


class TSStarImport(TSImport):
    def emit(self, module, name):
        yield self.line(['import * as ', name, " from '", module, "'"],
                        delim=True)


class TSDefaultImport(TSImport):
    def emit(self, module, alias):
        yield self.line(['import ', alias, " from '", module, "'"], delim=True)


class TSExport(TSStatement):
    def emit(self, names):
        yield self.line(['export ', '{', *delimited(', ', names), '}'],
                        delim=True)


class TSExportDefault(TSExport):
    def emit(self, name):
        yield self.line(['export default ', name], delim=True)


class TSExpressionStatement(TSStatement):
    def emit(self, value):
        yield self.part(value)


class TSBlock(TSStatement):
    pass


class TSIfStatement(TSBlock):
    def emit(self, test, body, orelse):
        yield self.line(['if (', test, ') {'])
        yield from self.lines(body, indent=True, delim=True)
        if orelse:
            yield self.line(['} else {'])
            yield from self.lines(orelse, indent=True, delim=True)
            yield self.line('}')
        else:
            yield self.line('}')


class TSWhileStatement(TSBlock):
    def emit(self, test, body):
        yield self.line(['while (', test, ') {'])
        yield from self.lines(body, indent=True, delim=True)
        yield self.line('}')


class TSForStatement(TSBlock):
    def emit(self, left, test, right, body):
        yield self.line(['for (', left, '; ', test, '; ', right, ') {'])
        yield from self.lines(body, indent=True, delim=True)
        yield self.line('}')


class TSForIterableStatement(TSBlock):

    operator = ' of '

    def emit(self, target, source, body):
        yield self.line(
            ['for (var ',
             self.part(target), self.operator, source, ') {'])
        yield from self.lines(body, indent=True, delim=True)
        yield self.line('}')


class TSForeachStatement(TSForIterableStatement):

    operator = ' in '


class TSForofStatement(TSForIterableStatement):
    pass


class TSTryCatchFinallyStatement(TSBlock):
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


class TSFunction(TSBlock):

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


class TSAsyncFunction(TSFunction):

    begin = 'async function '


class TSGenFunction(TSFunction):

    begin = 'function* '


class TSArrowFunction(TSFunction):

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


class TSClass(TSBlock):
    def emit(self, name, super_, methods):
        line = ['class ', name]
        if super_ is not None:
            line += [' extends ', super_]
        line += [' {']
        yield self.line(line)
        yield from self.lines(methods, indent=True, delim=True)
        yield self.line('}')


class TSClassMember(TSFunction):
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


class TSClassConstructor(TSClassMember):
    def emit(self, args, body, acc=None, kw=None):
        yield from self.with_kind('constructor', args, body, acc, kw)


class TSMethod(TSClassMember):
    def emit(self, name, args, body, acc=None, kw=None, static=False):
        yield from self.with_kind(name, args, body, acc, kw, static)


class TSAsyncMethod(TSClassMember):
    def emit(self, name, args, body, acc=None, kw=None, static=False):
        yield from self.with_kind('async ' + name, args, body, acc, kw, static)


class TSGenMethod(TSClassMember):
    def emit(self, name, args, body, acc=None, kw=None, static=False):
        yield from self.with_kind('* ' + name, args, body, acc, kw, static)


class TSGetter(TSClassMember):
    def emit(self, name, body, static=False):
        yield from self.with_kind('get ' + name, [], body, static=static)


class TSSetter(TSClassMember):
    def emit(self, name, arg, body, static=False):
        yield from self.with_kind('set ' + name, [arg], body, static=static)


TS_KEYWORDS = set([
    'break', 'case', 'catch', 'continue', 'default', 'delete', 'do', 'else',
    'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
    'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with',
    'abstract', 'boolean', 'byte', 'char', 'class', 'const', 'double', 'enum',
    'export', 'extends', 'final', 'float', 'goto', 'implements', 'import',
    'int', 'interface', 'long', 'native', 'package', 'private', 'protected',
    'public', 'short', 'static', 'super', 'synchronized', 'throws',
    'transient', 'volatile'
])

TS_KEYWORDS_ES6 = TS_KEYWORDS - set(['delete'])


def _check_keywords(target_node, name):
    trans = target_node.transformer
    if trans is not None:
        trans.unsupported(target_node.ast,
                          (name in TS_KEYWORDS_ES6
                           if trans.enable_es6 else name in TS_KEYWORDS),
                          "Name '%s' is reserved in TypeScript." % name)
    else:
        if name in TS_KEYWORDS:
            raise ValueError("Name %s is reserved in TypeScript." % name)
