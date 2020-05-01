from .base import TSStatement
from .util import _check_keywords
from ..processor.util import delimited


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
