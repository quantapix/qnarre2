from .base import TSNode
from ..processor.util import delimited_multi_line


class TSPass(TSNode):
    def emit(self):
        return []


class TSCommentBlock(TSNode):
    def emit(self, text):
        assert text.find('*/') == -1
        yield from self.lines(
            delimited_multi_line(self, text, '/*', '*/', True))
