import unittest

from frompy.nodes import Var

from py2ts.codegen.emit import Emitter, EmitterContext
from py2ts.ir.ops import BasicBlock, Environment
from py2ts.ir.rtypes import int_rprimitive
from py2ts.namegen import NameGenerator


class TestEmitter(unittest.TestCase):
    def setUp(self) -> None:
        self.env = Environment()
        self.n = self.env.add_local(Var('n'), int_rprimitive)
        self.context = EmitterContext(NameGenerator([['mod']]))
        self.emitter = Emitter(self.context, self.env)

    def test_label(self) -> None:
        assert self.emitter.label(BasicBlock(4)) == 'CPyL4'

    def test_reg(self) -> None:
        assert self.emitter.reg(self.n) == 'cpy_r_n'

    def test_emit_line(self) -> None:
        self.emitter.emit_line('line;')
        self.emitter.emit_line('a {')
        self.emitter.emit_line('f();')
        self.emitter.emit_line('}')
        assert self.emitter.fragments == ['line;\n',
                                          'a {\n',
                                          '    f();\n',
                                          '}\n']