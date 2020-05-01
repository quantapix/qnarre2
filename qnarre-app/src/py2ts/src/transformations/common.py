
import ast
from ..js_ast import (
    TSBinOp,
    TSMultipleArgsOp,
    TSName,
    TSOpInstanceof,
    TSOpOr,
    TSOpStrongEq,
    TSOpTypeof,
    TSStr,
    TSUnaryOp,
)


def _build_call_isinstance(tgt, cls_or_seq):
    """Helper to build the translate the equivalence of ``isinstance(foo, Bar)``
    to ``foo instanceof Bar`` and ``isinstance(Foo, (Bar, Zoo))`` to
    ``foo instanceof Bar || foo instanceof Zoo``.
    """
    if isinstance(cls_or_seq, (ast.Tuple, ast.List, ast.Set)):
        classes = cls_or_seq.elts
        args = tuple((tgt, c) for c in classes)
        return TSMultipleArgsOp(TSOpInstanceof(), TSOpOr(), *args)
    else:
        cls = cls_or_seq
        if isinstance(cls, ast.Name) and cls.id == 'str':
            return TSMultipleArgsOp(
                (TSOpStrongEq(), TSOpInstanceof()),
                TSOpOr(),
                (TSUnaryOp(TSOpTypeof(), tgt), TSStr('string')),
                (tgt, TSName('String'))
            )
        elif isinstance(cls, ast.Name) and cls.id in ['int', 'float']:
            return TSMultipleArgsOp(
                (TSOpStrongEq(), TSOpInstanceof()),
                TSOpOr(),
                (TSUnaryOp(TSOpTypeof(), tgt), TSStr('number')),
                (tgt, TSName('Number'))
            )
        else:
            return TSBinOp(tgt, TSOpInstanceof(), cls)
