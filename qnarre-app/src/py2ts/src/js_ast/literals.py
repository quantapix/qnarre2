import json

from .base import TSNode
from ..processor.util import delimited, delimited_multi_line


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
