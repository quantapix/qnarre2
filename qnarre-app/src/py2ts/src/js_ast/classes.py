from .blocks import TSBlock
from .functions import TSFunction


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
