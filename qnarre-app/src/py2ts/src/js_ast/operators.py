from .base import TSNode


class TSOperator(TSNode):
    pass


class TSLeftSideUnaryOp(TSOperator):
    pass


class TSOpIn(TSOperator):
    def emit(self):
        yield self.part('in')


class TSOpAnd(TSOperator):
    def emit(self):
        yield self.part('&&')


class TSOpOr(TSOperator):
    def emit(self):
        yield self.part('||')


class TSOpNot(TSLeftSideUnaryOp):
    def emit(self):
        yield self.part('!')


class TSOpInstanceof(TSOperator):
    def emit(self):
        yield self.part('instanceof')


class TSOpTypeof(TSLeftSideUnaryOp):
    def emit(self):
        yield self.part('typeof')


class TSOpAdd(TSOperator):
    def emit(self):
        yield self.part('+')


class TSOpSub(TSOperator):
    def emit(self):
        yield self.part('-')


class TSOpMult(TSOperator):
    def emit(self):
        yield self.part('*')


class TSOpDiv(TSOperator):
    def emit(self):
        yield self.part('/')


class TSOpMod(TSOperator):
    def emit(self):
        yield self.part('%')


class TSOpRShift(TSOperator):
    def emit(self):
        yield self.part('>>')


class TSOpLShift(TSOperator):
    def emit(self):
        yield self.part('<<')


class TSOpBitXor(TSOperator):
    def emit(self):
        yield self.part('^')


class TSOpBitAnd(TSOperator):
    def emit(self):
        yield self.part('&')


class TSOpBitOr(TSOperator):
    def emit(self):
        yield self.part('|')


class TSOpInvert(TSLeftSideUnaryOp):
    def emit(self):
        yield self.part('~')


class TSOpUSub(TSLeftSideUnaryOp):
    def emit(self):
        yield self.part('-')


class TSOpStrongEq(TSOperator):
    def emit(self):
        yield self.part('===')


class TSOpStrongNotEq(TSOperator):
    def emit(self):
        yield self.part('!==')


class TSOpLt(TSOperator):
    def emit(self):
        yield self.part('<')


class TSOpLtE(TSOperator):
    def emit(self):
        yield self.part('<=')


class TSOpGt(TSOperator):
    def emit(self):
        yield self.part('>')


class TSOpGtE(TSOperator):
    def emit(self):
        yield self.part('>=')


TSIs = TSOpStrongEq


class TSRest(TSOperator):
    def emit(self, value):
        yield self.part('...', value)
