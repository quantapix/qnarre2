from .base import JSNode
from ..processor.util import delimited_multi_line


class JSPass(JSNode):
    def emit(self):
        return []


class JSCommentBlock(JSNode):
    def emit(self, text):
        assert text.find('*/') == -1
        yield from self.lines(
            delimited_multi_line(self, text, '/*', '*/', True))
