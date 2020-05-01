from .base import TSStatement


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
