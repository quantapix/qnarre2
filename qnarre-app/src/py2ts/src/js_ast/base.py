import inspect

from ..processor.util import Line, Part


class Target:
    py_node = None
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
        pass

    @classmethod
    def final(cls, *transformed_args, **kw):
        tn = cls(**kw)
        tn.transformed_args = transformed_args
        return tn

    def line(self, item, indent=False, delim=False, name=None):
        if isinstance(item, Line):
            item.indent += int(indent)
            l = item
        elif isinstance(item, (tuple, list)):
            item = tuple(self._chain(item))
            l = Line(self, item, indent, delim, name)
        else:
            l = Line(self, item, indent, delim, name)
        return l

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


class TSStatement(TSNode):
    pass
