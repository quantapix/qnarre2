from .blocks import TSBlock
from ..processor.util import delimited


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
