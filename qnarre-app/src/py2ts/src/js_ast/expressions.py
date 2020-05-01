import re

from .base import TSNode
from .operators import TSLeftSideUnaryOp
from ..processor.util import delimited, delimited_multi_line
from .util import _check_keywords


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


class TSUnaryOp(TSNode):
    def emit(self, op, right):
        assert isinstance(op, TSLeftSideUnaryOp)
        yield self.part('(', op, ' ', right, ')')


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
