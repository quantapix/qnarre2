
import ast
from functools import reduce

from . import _normalize_name, _normalize_dict_keys

from ..js_ast import (
    TSAssignmentExpression,
    TSArrowFunction,
    TSAttribute,
    TSAugAssignStatement,
    TSAwait,
    TSBinOp,
    TSBreakStatement,
    TSCall,
    TSContinueStatement,
    TSDeleteStatement,
    TSDict,
    TSExport,
    TSExpressionStatement,
    TSFalse,
    TSIfExp,
    TSIfStatement,
    TSList,
    TSName,
    TSNull,
    TSNum,
    TSOpAdd,
    TSOpAnd,
    TSOpBitAnd,
    TSOpBitOr,
    TSOpBitXor,
    TSOpDiv,
    TSOpGt,
    TSOpGtE,
    TSOpIn,
    TSOpInvert,
    TSOpLShift,
    TSOpLt,
    TSOpLtE,
    TSOpMod,
    TSOpMult,
    TSOpNot,
    TSOpOr,
    TSOpRShift,
    TSOpSub,
    TSOpUSub,
    TSPass,
    TSRest,
    TSReturnStatement,
    TSStatements,
    TSStr,
    TSSubscript,
    TSTemplateLiteral,
    TSTrue,
    TSUnaryOp,
    TSWhileStatement,
    TSYield,
    TSYieldStar,
)

#### Statements


def Assign_default(t, x):
    y = TSAssignmentExpression(x.targets[-1], x.value)
    for i in range(len(x.targets) - 1):
        y = TSAssignmentExpression(x.targets[-(2 + i)], y)
    return TSExpressionStatement(y)


# Python 3.6+ typehints are accepted and ignored
def AnnAssign(t, x):
    return TSExpressionStatement(TSAssignmentExpression(x.target, x.value))


def Assign_all(t, x):
    if len(x.targets) == 1 and isinstance(x.targets[0], ast.Name) and \
       x.targets[0].id == '__all__':
        t.es6_guard(x, "'__all__' assignment requires ES6")
        t.unsupported(
            x, not isinstance(x.value, (ast.Tuple, ast.List)),
            "Please define a '__default__' member for default"
            " export.")
        elements = x.value.elts
        return TSExport([
            el.s for el in elements if not t.unsupported(
                el, not isinstance(el, ast.Str), 'Must be a string literal.')
        ])


def AugAssign(t, x):
    return TSAugAssignStatement(x.target, x.op, x.value)


def If(t, x):
    return TSIfStatement(x.test, x.body, x.orelse)


def While(t, x):
    assert not x.orelse
    return TSWhileStatement(x.test, x.body)


def Break(t, x):
    return TSBreakStatement()


def Continue(t, x):
    return TSContinueStatement()


def Pass(t, x):
    return TSPass()


def Return(t, x):
    # x.value is None for blank return statements
    return TSReturnStatement(x.value)


def Delete(t, x):
    js = []
    for t in x.targets:
        jd = TSDeleteStatement(t)
        if len(x.targets) == 1:
            jd.py_node = x
        else:
            jd.py_node = t
        js.append(jd)
    return TSStatements(*js)


def Await(t, x):
    t.stage3_guard(x, "Async stuff requires 'stage3' to be enabled")
    return TSAwait(x.value)


#### Expressions


def Expr_default(t, x):
    # See [pj.transformations.special](special.py) for special cases
    return TSExpressionStatement(x.value)


def List(t, x):
    return TSList(x.elts)


def Tuple(t, x):
    return TSList(x.elts)


def Dict(t, x):
    return TSDict(_normalize_dict_keys(t, x.keys), x.values)


def Lambda(t, x):
    assert not any(
        getattr(x.args, k)
        for k in ['vararg', 'kwonlyargs', 'kwarg', 'defaults', 'kw_defaults'])
    return TSArrowFunction(None, [arg.arg for arg in x.args.args],
                           [TSReturnStatement(x.body)])


def IfExp(t, x):
    return TSIfExp(x.test, x.body, x.orelse)


def Call_default(t, x, operator=None):
    # See [pj.transformations.special](special.py) for special cases
    kwkeys = []
    kwvalues = []
    if x.keywords:
        for kw in x.keywords:
            t.unsupported(x, kw.arg is None, "'**kw' syntax isn't "
                          "supported")
            kwkeys.append(kw.arg)
            kwvalues.append(kw.value)
        kw = TSDict(_normalize_dict_keys(t, kwkeys), kwvalues)
    else:
        kw = None
    return TSCall(x.func, x.args, kw, operator)


def Attribute_default(t, x):
    return TSAttribute(x.value, _normalize_name(str(x.attr)))


def Subscript_default(t, x):
    assert isinstance(x.slice, ast.Index)
    v = x.slice.value
    if isinstance(v, ast.UnaryOp) and isinstance(v.op, ast.USub):
        return TSSubscript(TSCall(TSAttribute(x.value, 'slice'), [v]),
                           TSNum(0))
    return TSSubscript(x.value, v)


def UnaryOp(t, x):
    return TSUnaryOp(x.op, x.operand)


def BinOp_default(t, x):
    # See [pj.transformations.special](special.py) for special cases
    return TSBinOp(x.left, x.op, x.right)


def BoolOp(t, x):
    return reduce(lambda left, right: TSBinOp(left, x.op, right), x.values)


def Compare_default(t, x):
    """Compare is for those expressions like 'x in []' or 1 < x < 10. It's
    different from a binary operations because it can have multiple
    operators and more than two operands."""
    exps = [x.left] + x.comparators
    bools = []
    for i in range(len(x.ops)):
        bools.append(TSBinOp(exps[i], x.ops[i], exps[i + 1]))
    return reduce(lambda x, y: TSBinOp(x, TSOpAnd(), y), bools)


#### Atoms


def Num(t, x):
    return TSNum(x.n)


def Str(t, x):
    return TSStr(x.s)


def JoinedStr(t, x):
    t.es6_guard(x, "f-strings require ES6")
    chunks = []
    for value in x.values:
        if isinstance(value, ast.Str):
            chunks.append(value.s)
        else:
            assert isinstance(value, ast.FormattedValue)
            t.unsupported(x, value.conversion != -1,
                          "f-string conversion spec isn't supported")
            t.unsupported(x, value.format_spec is not None,
                          "f-string format spec isn't supported")
            chunks.append('${%s}' % t._transform_node(value.value))
    return TSTemplateLiteral(''.join(chunks))


def Name_default(t, x):
    # {True,False,None} are Names
    cls = {
        'True': TSTrue,
        'False': TSFalse,
        'None': TSNull,
    }.get(x.id)
    if cls:
        return cls()
    else:
        n = x.id
        n = _normalize_name(n)
        return TSName(n)


def NameConstant(t, x):
    cls = {
        True: TSTrue,
        False: TSFalse,
        None: TSNull,
    }[x.value]
    return cls()


# Take care of Python 3.8's deprecations:
# https://docs.python.org/3/library/ast.html#node-classes
def Constant(t, x):
    if isinstance(x.value, bool) or x.value is None:
        return NameConstant(t, x)
    elif isinstance(x.value, (int, float, complex)):
        return Num(t, x)
    elif isinstance(x.value, str):
        return Str(t, x)
    else:
        # Should constant collections (tuple and frozensets
        # containing constant elements) be handled here as well?
        # See https://greentreesnakes.readthedocs.io/en/latest/nodes.html#Constant
        raise ValueError('Unknown data type received.')


def Yield(t, x):
    return TSYield(x.value)


def YieldFrom(t, x):
    return TSYieldStar(x.value)


#### Ops


def In(t, x):
    return TSOpIn()


def Add(t, x):
    return TSOpAdd()


def Sub(t, x):
    return TSOpSub()


def USub(t, x):
    "Handles tokens like '-1'"
    return TSOpUSub()


def Mult(t, x):
    return TSOpMult()


def Div(t, x):
    return TSOpDiv()


def Mod(t, x):
    return TSOpMod()


def RShift(t, x):
    return TSOpRShift()


def LShift(t, x):
    return TSOpLShift()


def BitXor(t, x):
    return TSOpBitXor()


def BitAnd(t, x):
    return TSOpBitAnd()


def BitOr(t, x):
    return TSOpBitOr()


def Invert(t, x):
    return TSOpInvert()


def And(t, x):
    return TSOpAnd()


def Or(t, x):
    return TSOpOr()


def Not(t, x):
    return TSOpNot()


# == and != are in special.py
# because they transform to === and !==


def Lt(t, x):
    return TSOpLt()


def LtE(t, x):
    return TSOpLtE()


def Gt(t, x):
    return TSOpGt()


def GtE(t, x):
    return TSOpGtE()


def Starred(t, x):
    return TSRest(x.value)
