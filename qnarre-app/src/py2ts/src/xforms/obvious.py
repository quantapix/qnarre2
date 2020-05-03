import re
import ast
from functools import reduce
from unicodedata import lookup

from .. import ts


def Assign_default(t, x):
    y = ts.AssignmentExpression(x.targets[-1], x.value)
    for i in range(len(x.targets) - 1):
        y = ts.AssignmentExpression(x.targets[-(2 + i)], y)
    return ts.ExpressionStatement(y)


def AnnAssign(t, x):
    return ts.ExpressionStatement(ts.AssignmentExpression(x.target, x.value))


def Assign_all(t, x):
    if len(x.targets) == 1 and isinstance(x.targets[0], ast.Name) and \
       x.targets[0].id == '__all__':
        t.unsupported(
            x, not isinstance(x.value, (ast.Tuple, ast.List)),
            "Please define a '__default__' member for default"
            " export.")
        elements = x.value.elts
        return ts.Export([
            el.s for el in elements if not t.unsupported(
                el, not isinstance(el, ast.Str), 'Must be a string literal.')
        ])


def AugAssign(t, x):
    return ts.AugAssignStatement(x.target, x.op, x.value)


def If(t, x):
    return ts.IfStatement(x.test, x.body, x.orelse)


def While(t, x):
    assert not x.orelse
    return ts.WhileStatement(x.test, x.body)


def Break(t, x):
    return ts.BreakStatement()


def Continue(t, x):
    return ts.ContinueStatement()


def Pass(t, x):
    return ts.Pass()


def Return(t, x):
    return ts.ReturnStatement(x.value)


def Delete(t, x):
    js = []
    for j in x.targets:
        jd = ts.DeleteStatement(j)
        if len(x.targets) == 1:
            jd.py_node = x
        else:
            jd.py_node = t
        js.append(jd)
    return ts.Statements(*js)


def Await(t, x):
    return ts.Await(x.value)


def Expr_default(t, x):
    return ts.ExpressionStatement(x.value)


def List(t, x):
    return ts.List(x.elts)


def Tuple(t, x):
    return ts.List(x.elts)


def Dict(t, x):
    return ts.Dict(_normalize_dict_keys(t, x.keys), x.values)


def Lambda(t, x):
    assert not any(
        getattr(x.args, k)
        for k in ['vararg', 'kwonlyargs', 'kwarg', 'defaults', 'kw_defaults'])
    return ts.ArrowFunction(None, [arg.arg for arg in x.args.args],
                            [ts.ReturnStatement(x.body)])


def IfExp(t, x):
    return ts.IfExp(x.test, x.body, x.orelse)


def Call_default(t, x, operator=None):
    kwkeys = []
    kwvalues = []
    if x.keywords:
        for kw in x.keywords:
            t.unsupported(x, kw.arg is None, "'**kw' syntax isn't "
                          "supported")
            kwkeys.append(kw.arg)
            kwvalues.append(kw.value)
        kw = ts.Dict(_normalize_dict_keys(t, kwkeys), kwvalues)
    else:
        kw = None
    return ts.Call(x.func, x.args, kw, operator)


def Attribute_default(t, x):
    return ts.Attribute(x.value, _normalize_name(str(x.attr)))


def Subscript_default(t, x):
    assert isinstance(x.slice, ast.Index)
    v = x.slice.value
    if isinstance(v, ast.UnaryOp) and isinstance(v.op, ast.USub):
        return ts.Subscript(ts.Call(ts.Attribute(x.value, 'slice'), [v]),
                            ts.Num(0))
    return ts.Subscript(x.value, v)


def UnaryOp(t, x):
    return ts.UnaryOp(x.op, x.operand)


def BinOp_default(t, x):
    return ts.BinOp(x.left, x.op, x.right)


def BoolOp(t, x):
    return reduce(lambda left, right: ts.BinOp(left, x.op, right), x.values)


def Compare_default(t, x):
    """Compare is for those expressions like 'x in []' or 1 < x < 10. It's
    different from a binary operations because it can have multiple
    operators and more than two operands."""
    exps = [x.left] + x.comparators
    bools = []
    for i in range(len(x.ops)):
        bools.append(ts.BinOp(exps[i], x.ops[i], exps[i + 1]))
    return reduce(lambda x, y: ts.BinOp(x, ts.OpAnd(), y), bools)


def Num(t, x):
    return ts.Num(x.n)


def Str(t, x):
    return ts.Str(x.s)


def JoinedStr(t, x):
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
    return ts.TemplateLiteral(''.join(chunks))


def Name_default(t, x):
    # {True,False,None} are Names
    cls = {
        'True': ts.LTrue,
        'False': ts.LFalse,
        'None': ts.Null,
    }.get(x.id)
    if cls:
        return cls()
    else:
        n = x.id
        n = _normalize_name(n)
        return ts.Name(n)


def NameConstant(t, x):
    cls = {
        True: ts.LTrue,
        False: ts.LFalse,
        None: ts.Null,
    }[x.value]
    return cls()


def Constant(t, x):
    if isinstance(x.value, bool) or x.value is None:
        return NameConstant(t, x)
    elif isinstance(x.value, (int, float, complex)):
        return Num(t, x)
    elif isinstance(x.value, str):
        return Str(t, x)
    else:
        raise ValueError('Unknown data type received.')


def Yield(t, x):
    return ts.Yield(x.value)


def YieldFrom(t, x):
    return ts.YieldStar(x.value)


def In(t, x):
    return ts.OpIn()


def Add(t, x):
    return ts.OpAdd()


def Sub(t, x):
    return ts.OpSub()


def USub(t, x):
    "Handles tokens like '-1'"
    return ts.OpUSub()


def Mult(t, x):
    return ts.OpMult()


def Div(t, x):
    return ts.OpDiv()


def Mod(t, x):
    return ts.OpMod()


def RShift(t, x):
    return ts.OpRShift()


def LShift(t, x):
    return ts.OpLShift()


def BitXor(t, x):
    return ts.OpBitXor()


def BitAnd(t, x):
    return ts.OpBitAnd()


def BitOr(t, x):
    return ts.OpBitOr()


def Invert(t, x):
    return ts.OpInvert()


def And(t, x):
    return ts.OpAnd()


def Or(t, x):
    return ts.OpOr()


def Not(t, x):
    return ts.OpNot()


def Lt(t, x):
    return ts.OpLt()


def LtE(t, x):
    return ts.OpLtE()


def Gt(t, x):
    return ts.OpGt()


def GtE(t, x):
    return ts.OpGtE()


def Starred(t, x):
    return ts.Rest(x.value)


def Expr_docstring(t, x):
    if isinstance(x.value, ast.Str):
        return ts.CommentBlock(x.value.s)


Expr = [Expr_docstring, Expr_default]


def BinOp_pow(t, x):
    if isinstance(x.op, ast.Pow):
        return ts.Call(ts.Attribute(ts.Name('Math'), 'pow'), [x.left, x.right])


BinOp = [BinOp_pow, BinOp_default]


def Name_self(t, x):
    if x.id == 'self':
        return ts.This()


Name = [Name_self, Name_default]


def Call_typeof(t, x):
    if (isinstance(x.func, ast.Name) and x.func.id == 'typeof'):
        assert len(x.args) == 1
        return ts.UnaryOp(ts.OpTypeof(), x.args[0])


def Call_callable(t, x):
    """Translate ``callable(foo)`` to ``foo instanceof Function``."""
    if (isinstance(x.func, ast.Name) and x.func.id == 'callable'):
        assert len(x.args) == 1
        return ts.BinOp(
            ts.BinOp(x.args[0], ts.OpInstanceof(), ts.Name('Function')),
            ts.OpOr(),
            ts.BinOp(ts.UnaryOp(ts.OpTypeof(), x.args[0]), ts.OpStrongEq(),
                     ts.Str('function')))


def Call_print(t, x):
    if (isinstance(x.func, ast.Name) and x.func.id == 'print'):
        return ts.Call(ts.Attribute(ts.Name('console'), 'log'), x.args)


def Call_len(t, x):
    if (isinstance(x.func, ast.Name) and x.func.id == 'len'
            and len(x.args) == 1):
        return ts.Attribute(x.args[0], 'length')


def Call_str(t, x):
    if (isinstance(x.func, ast.Name) and x.func.id == 'str'
            and len(x.args) == 1):
        return ts.Call(ts.Attribute(ts.Name(x.args[0]), 'toString'), [])


def Call_new(t, x):
    """Translate ``Foo(...)`` to ``new Foo(...)`` if function name starts
    with a capital letter.
    """
    def getNameString(x):
        if isinstance(x, ast.Name):
            return x.id
        elif isinstance(x, ast.Attribute):
            return str(x.attr)
        elif isinstance(x, ast.Subscript):
            if isinstance(x.slice, ast.Index):
                return str(x.slice.value)

    NAME_STRING = getNameString(x.func)

    if (NAME_STRING and re.search(r'^[A-Z]', NAME_STRING)):
        # TODO: generalize args mangling and apply here
        # assert not any([x.keywords, x.starargs, x.kw])
        subj = x
    elif isinstance(x.func, ast.Name) and x.func.id == 'new':
        subj = x.args[0]
    else:
        subj = None
    if subj:
        return Call_default(t, subj, operator='new ')


def Call_import(t, x):
    if (isinstance(x.func, ast.Name) and x.func.id == '__import__'):
        assert len(x.args) == 1 and isinstance(x.args[0], ast.Str)
        return ts.DependImport(x.args[0].s)


def Call_type(t, x):
    if (isinstance(x.func, ast.Name) and x.func.id == 'type'):
        assert len(x.args) == 1
        return ts.Call(ts.Attribute(ts.Name('Object'), 'getPrototypeOf'),
                       x.args)


def Call_dict_update(t, x):
    """Convert ``dict(foo).update(bar)`` to ``Object.assign(foo, bar)``.

    Requires ES6

    AST dump::

      Expr(value=Call(args=[Name(ctx=Load(),
                                 id='bar')],
                      func=Attribute(attr='update',
                                     ctx=Load(),
                                     value=Call(args=[Name(ctx=Load(),
                                                           id='foo')],
                                                func=Name(ctx=Load(),
                                                          id='dict'),
                                                keywords=[])),
                      keywords=[]))

    """
    if isinstance(x.func, ast.Attribute) and x.func.attr == 'update' and \
       isinstance(x.func.value, ast.Call) and  \
       isinstance(x.func.value.func, ast.Name) and \
       x.func.value.func.id == 'dict' and len(x.func.value.args) == 1:
        return ts.Call(ts.Attribute(ts.Name('Object'), 'assign'),
                       [x.func.value.args[0]] + x.args)


def Call_dict_copy(t, x):
    """Convert ``dict(foo).copy()`` to ``Object.assign({}, foo)``.

    Requires ES6

    AST dump::

      Expr(value=Call(args=[],
                      func=Attribute(attr='copy',
                                     ctx=Load(),
                                     value=Call(args=[Name(ctx=Load(),
                                                           id='foo')],
                                                func=Name(ctx=Load(),
                                                          id='dict'),
                                                keywords=[])),
                      keywords=[]))
    """
    if isinstance(x.func, ast.Attribute) and x.func.attr == 'copy' and \
       isinstance(x.func.value, ast.Call) and  \
       isinstance(x.func.value.func, ast.Name) and \
       x.func.value.func.id == 'dict' and len(x.func.value.args) == 1:
        return ts.Call(ts.Attribute(ts.Name('Object'), 'assign'),
                       (ts.Dict([], []), x.func.value.args[0]))


def Call_template(t, x):
    if (isinstance(x.func, ast.Name) and x.func.id == 'tmpl') and \
       len(x.args) > 0:
        assert len(x.args) == 1
        assert isinstance(x.args[0], ast.Str)
        return ts.TemplateLiteral(x.args[0].s)


def Call_tagged_template(t, x):
    if (isinstance(x.func, ast.Name) and x.func.id == '__') and \
       len(x.args) > 0 and t.parent_of(x) is not ast.Attribute:
        assert 3 > len(x.args) >= 1
        assert isinstance(x.args[0], ast.Str)
        if len(x.args) == 2:
            tag = x.args[1]
        else:
            tag = ts.Name('__')
        return ts.TaggedTemplate(x.args[0].s, tag)


def Call_hasattr(t, x):
    """Translate ``hasattr(foo, bar)`` to ``bar in foo``."""
    if (isinstance(x.func, ast.Name) and x.func.id == 'hasattr') and \
       len(x.args) == 2:
        return ts.BinOp(x.args[1], ts.OpIn(), x.args[0])


def Call_getattr(t, x):
    """Translate ``getattr(foo, bar, default)`` to ``foo[bar] || default``."""
    if (isinstance(x.func, ast.Name) and x.func.id == 'getattr') and \
       2 <= len(x.args) < 4:
        if len(x.args) == 2:
            res = ts.Subscript(x.args[0], x.args[1])
        else:
            res = ts.BinOp(ts.Subscript(x.args[0], x.args[1]), ts.OpOr(),
                           x.args[2])
        return res


def Call_setattr(t, x):
    """Translate ``setattr(foo, bar, value)`` to ``foo[bar] = value``."""
    if (isinstance(x.func, ast.Name) and x.func.id == 'setattr') and \
       len(x.args) == 3:
        return ts.ExpressionStatement(
            ts.AssignmentExpression(ts.Subscript(x.args[0], x.args[1]),
                                    x.args[2]))


def Call_TS(t, x):
    if (isinstance(x.func, ast.Name) and x.func.id == 'ts.') and \
       len(x.args) == 1:
        assert isinstance(x.args[0], ast.Str)
        return ts.Literal(x.args[0].s)


def Call_int(t, x):
    # maybe this needs a special keywords mangling for optional "base" param
    if isinstance(x.func, ast.Name) and x.func.id == 'int':
        return ts.Call(ts.Attribute('Number', 'parseInt'), x.args)


def Call_float(t, x):
    if isinstance(x.func, ast.Name) and x.func.id == 'float':
        return ts.Call(ts.Attribute('Number', 'parseFloat'), x.args)


Call = [
    Call_typeof, Call_callable, Call_isinstance, Call_print, Call_len, Call_TS,
    Call_new, Call_super, Call_import, Call_str, Call_type, Call_dict_update,
    Call_dict_copy, Call_tagged_template, Call_template, Call_hasattr,
    Call_getattr, Call_setattr, Call_issubclass, Call_int, Call_float,
    Call_default
]


def Eq(t, x):
    return ts.OpStrongEq()


Is = Eq


def NotEq(t, x):
    return ts.OpStrongNotEq()


IsNot = NotEq

AT_PREFIX_RE = re.compile(r'^__([a-zA-Z0-9])')
INSIDE_DUNDER_RE = re.compile(r'([a-zA-Z0-9])__([a-zA-Z0-9])')

GEN_PREFIX_RE = re.compile(r'((?:[a-zA-Z][a-z]+)+)_')
SINGLE_WORD_RE = re.compile(r'([A-Z][a-z]+)')
_shortcuts = {'at': '@'}


def _notable_replacer_gen():
    """This is used together with 'GEN_PREFIX_RE' to replace unicode
    symbol names in module prefixes. Some names are shortcut using the
    ``_shortcuts`` map. It's designed to replace matches olny if they
    are located at the beginning of the string and if they are
    subsequent to one another. It returns a function to be used with a
    regular expression object ``sub()`` method.
    """
    last_match_end = None

    def replace_notable_name(match):
        nonlocal last_match_end
        # try to replace only if the match is positioned at the start
        # or is following another match
        if ((last_match_end is None and match.start() == 0)
                or (isinstance(last_match_end, int)
                    and last_match_end == match.start())):
            last_match_end = match.end()
            prefix = match.group(1)
            low_prefix = prefix.lower()
            if low_prefix in _shortcuts:
                return _shortcuts[low_prefix]
            try:
                prefix = SINGLE_WORD_RE.sub(r' \1', prefix).strip()
                return lookup(prefix)
            except KeyError:
                pass
        return match.group()

    return replace_notable_name


def _replace_identifiers_with_symbols(dotted_str):
    """Replaces two kinds of identifiers with characters. This is used to
    express characters that are used in ts. module paths in Python's
    ``import`` statements.

    1. The first replaces ``__`` (a "dunder") with ``@`` if it's at
       the beginning and with ``-`` if it's in the middle of two
       words;
    2. the second replaces notable names ending with an underscore
       like ``tilde_`` with the corresponding character (only at the
       beginning).

    Returns a string with the mangled dotted path
    """
    dotted_str = AT_PREFIX_RE.sub(r'@\1', dotted_str)
    dotted_str = INSIDE_DUNDER_RE.sub(r'\1-\2', dotted_str)

    dotted_str = GEN_PREFIX_RE.sub(_notable_replacer_gen(), dotted_str)

    return dotted_str


def Import(t, x):
    names = []
    for n in x.names:
        names.append(n.asname or n.name)
    t.add_globals(*names)
    result = []
    for n in x.names:
        old_name = n.name
        n.name = _replace_identifiers_with_symbols(n.name)
        t.unsupported(
            x, (old_name != n.name) and not n.asname,
            "Invalid module name: {!r}: use 'as' to give "
            "it a new name.".format(n.name))
        path_module = '/'.join(n.name.split('.'))
        result.append(ts.StarImport(path_module, n.asname or n.name))
    return ts.Statements(*result)


def ImportFrom(t, x):
    names = []
    for n in x.names:
        names.append(n.asname or n.name)
    if x.module == '__globals__':
        assert x.level == 0
        # assume a fake import to import js stuff from root object
        t.add_globals(*names)
        result = ts.Pass()
    else:
        t.add_globals(*names)
        result = ts.Pass()
        if x.module:
            mod = tuple(
                _normalize_name(frag) for frag in
                _replace_identifiers_with_symbols(x.module).split('.'))
            path_module = '/'.join(mod)
            if x.level == 1:
                # from .foo import bar
                path_module = './' + path_module
            elif x.level > 1:
                # from ..foo import bar
                # from ...foo import bar
                path_module = '../' * (x.level - 1) + path_module
            if len(x.names) == 1 and x.names[0].name == '__default__':
                t.unsupported(x, x.names[0].asname is None,
                              "Default import must declare an 'as' clause.")
                result = ts.DefaultImport(path_module, x.names[0].asname)
            else:
                result = ts.NamedImport(path_module,
                                        [(n.name, n.asname) for n in x.names])
        else:
            assert x.level > 0
            result = []
            for n in x.names:
                if x.level == 1:
                    # from . import foo
                    imp = ts.StarImport('./' + n.name, n.asname or n.name)
                else:
                    # from .. import foo
                    imp = ts.StarImport('../' * (x.level - 1) + n.name,
                                        n.asname or n.name)
                if len(x.names) == 1:
                    imp.py_node = x
                else:
                    imp.py_node = n
                result.append(imp)
            result = ts.Statements(*result)
    return result


def Compare_in(t, x):
    if not isinstance(x.ops[0], (ast.NotIn, ast.In)):
        return
    if t.snippets:
        from ..snippets import in_es6
        t.add_snippet(in_es6)
        sname = 'in_es6'
        result = ts.Call(ts.Attribute('_pj', sname),
                         [x.left, x.comparators[0]])
        if isinstance(x.ops[0], ast.NotIn):
            result = ts.UnaryOp(ts.OpNot(), result)
        return result


Compare = [Compare_in, Compare_default]


def Subscript_slice(t, x):

    if isinstance(x.slice, ast.Slice):
        slice = x.slice
        t.unsupported(x, slice.step and slice.step != 1,
                      "Slice step is unsupported")
        args = []
        if slice.lower:
            args.append(slice.lower)
        else:
            args.append(ts.Num(0))
        if slice.upper:
            args.append(slice.upper)

        return ts.Call(ts.Attribute(x.value, 'slice'), args)


Subscript = [Subscript_slice, Subscript_super, Subscript_default]


def Attribute_list_append(t, x):
    """Convert ``list(foo).append(bar)`` to ``foo.push(bar)``.

    AST dump::

      Expr(value=Call(args=[Name(ctx=Load(),
                                 id='bar')],
                      func=Attribute(attr='append',
                                     ctx=Load(),
                                     value=Call(args=[Name(ctx=Load(),
                                                           id='foo')],
                                                func=Name(ctx=Load(),
                                                          id='list'),
                                                keywords=[])),
                      keywords=[]))
    """
    if x.attr == 'append' and isinstance(x.value, ast.Call) and \
       isinstance(x.value.func, ast.Name) and x.value.func.id == 'list' and \
       len(x.value.args) == 1:
        return ts.Attribute(x.value.args[0], 'push')


Attribute = [Attribute_super, Attribute_list_append, Attribute_default]


def Assert(t, x):
    """Convert ``assert`` statement to just a snippet function call."""
    if t.snippets:
        from ..snippets import _assert
        t.add_snippet(_assert)
        return ts.Call(ts.Attribute('_pj', '_assert'),
                       [x.test, x.msg or ts.Null()])


def Assign_default_(t, x):
    if len(x.targets) == 1 and isinstance(x.targets[0], ast.Name) and \
       x.targets[0].id == '__default__':
        t.unsupported(x.value, isinstance(x.value, (ast.Tuple, ast.List)),
                      "Only one symbol can be exported using '__default__'.")
        if isinstance(x.value, ast.Str):
            return ts.ExportDefault(x.value.s)
        else:
            return ts.ExportDefault(x.value)


Assign = [Assign_all, Assign_default_, Assign_default]


def For_range(t, x):
    """Special conversion for ``for name in range(n)``, which detects
    ``range()`` calls and converts the statement to:

    .. code:: javascript

      for (var name = 0, bound = bound; name < bound; name++) {
          // ...
      }

    """
    if (isinstance(x.target, ast.Name) and isinstance(x.iter, ast.Call)
            and isinstance(x.iter.func, ast.Name) and x.iter.func.id == 'range'
            and 1 <= len(x.iter.args) < 4) and (not x.orelse):

        name = x.target
        body = x.body
        if len(x.iter.args) == 1:
            start = ts.Num(0)
            bound = x.iter.args[0]
            step = ts.Num(1)
        elif len(x.iter.args) == 2:
            start = x.iter.args[0]
            bound = x.iter.args[1]
            step = ts.Num(1)
        else:
            start = x.iter.args[0]
            bound = x.iter.args[1]
            step = x.iter.args[2]

        bound_name = t.new_name()

        return ts.ForStatement(
            ts.VarStatement([name.id, bound_name], [start, bound]),
            ts.BinOp(ts.Name(name.id), ts.OpLt(), ts.Name(bound_name)),
            ts.AugAssignStatement(ts.Name(name.id), ts.OpAdd(), step), body)


def For_dict(t, x):
    """Special ``for name in dict(expr)`` statement translation.

    It detects the ``dict()`` call and converts it to:

    .. code:: javascript

      var dict_ = expr;
      for (var name in dict_) {
          if (dict_.hasOwnProperty(name)) {
          // ...
          }
      }
    """
    if (isinstance(x.iter, ast.Call) and isinstance(x.iter.func, ast.Name)
            and x.iter.func.id == 'dict'
            and len(x.iter.args) <= 2) and (not x.orelse):

        t.unsupported(x, not isinstance(x.target, ast.Name),
                      "Target must be a name")

        name = x.target
        expr = x.iter.args[0]
        body = x.body

        dict_ = t.new_name()

        # if not ``dict(foo, True)`` filter out inherited values
        if not (len(x.iter.args) == 2 and isinstance(
                x.iter.args[1], ast.NameConstant) and x.iter.args[1].value):
            body = [
                ts.IfStatement(
                    ts.Call(ts.Attribute(ts.Name(dict_), 'hasOwnProperty'),
                            [ts.Name(name.id)]), body, None)
            ]
        loop = ts.ForeachStatement(name.id, ts.Name(dict_), body)
        loop.py_node = x

        return ts.Statements(ts.VarStatement([dict_], [expr], unmovable=True),
                             loop)


def For_iterable(t, x):
    """Special ``for name in iterable(expr)`` statement translation.

    It detects the ``iterable()`` call and converts it to:

    .. code:: javascript

      var __iterable = expr;
      for (var name of __iterable) {
          ...
      }
    """
    if (isinstance(x.iter, ast.Call) and isinstance(x.iter.func, ast.Name)
            and x.iter.func.id == 'iterable'
            and len(x.iter.args) == 1) and (not x.orelse):
        expr = x.iter.args[0]
        body = x.body
        target = x.target
        return ts.ForofStatement(
            target,
            expr,
            body,
        )


def For_default(t, x):
    """Assumes that the iteration is over a list.

    Converts something like:

    .. code:: python

      for name in expr:
          #body...

    to:

    .. code:: javascript

      for(var name, arr=expr, ix=0, length=arr.length; ix < length: ix++) {
          name = arr[ix];
          //body ...
      }

    """

    t.unsupported(x, not isinstance(x.target, ast.Name),
                  "Target must be a name,"
                  " Are you sure is only one?")

    name = x.target
    expr = x.iter
    body = x.body

    arr = t.new_name()
    length = t.new_name()
    ix = t.new_name()

    return ts.ForStatement(
        ts.VarStatement(
            [name.id, ix, arr, length],
            [None, ts.Num(0), expr,
             ts.Attribute(ts.Name(arr), 'length')],
            unmovable=True), ts.BinOp(ts.Name(ix), ts.OpLt(), ts.Name(length)),
        ts.ExpressionStatement(
            ts.AugAssignStatement(ts.Name(ix), ts.OpAdd(), ts.Num(1))),
        [
            ts.ExpressionStatement(
                ts.AssignmentExpression(
                    ts.Name(name.id), ts.Subscript(ts.Name(arr), ts.Name(ix))))
        ] + body)


For = [For_range, For_dict, For_iterable, For_default]


def Try(t, x):
    t.unsupported(x, x.orelse,
                  "'else' block of 'try' statement isn't supported")
    known_exc_types = (ast.Name, ast.Attribute, ast.Tuple, ast.List)
    ename = None
    if x.handlers:
        for h in x.handlers:
            if h.type is not None and not isinstance(h.type, known_exc_types):
                t.warn(
                    x, "Exception type expression might not evaluate to a "
                    "valid type or sequence of types.")
            ename = h.name
        ename = ename or 'e'
        if t.has_child(x.handlers, ast.Raise) and t.has_child(
                x.finalbody, ast.Return):
            t.warn(
                x, "The re-raise in 'except' body may be masked by the "
                "return in 'final' body.")
        rhandlers = x.handlers.copy()
        rhandlers.reverse()
        prev_except = stmt = None
        for ix, h in enumerate(rhandlers):
            body = h.body
            if h.name is not None and h.name != ename:
                # Rename the exception to match the handler
                rename = ts.VarStatement([h.name], [ename])
                body = [rename] + h.body

            # if it's  the last except and it's a catchall
            # threat 'except Exception:' as a catchall
            if (ix == 0 and h.type is None or
                (isinstance(h.type, ast.Name) and h.type.id == 'Exception')):
                prev_except = ts.Statements(*body)
                continue
            else:
                if ix == 0:
                    prev_except = ts.ThrowStatement(ts.Name(ename))
                stmt = ts.IfStatement(
                    _build_call_isinstance(ts.Name(ename), h.type), body,
                    prev_except)
            prev_except = stmt
        t.ctx['ename'] = ename
        result = ts.TryCatchFinallyStatement(x.body, ename, prev_except,
                                             x.finalbody)
    else:
        result = ts.TryCatchFinallyStatement(x.body, None, None, x.finalbody)
    return result


def Raise(t, x):
    if x.exc is None:
        ename = t.ctx.get('ename')
        t.unsupported(
            x, not ename, "'raise' has no argument but failed obtaining"
            " implicit exception")
        res = ts.ThrowStatement(ts.Name(ename))
    elif isinstance(x.exc, ast.Call) and isinstance(
            x.exc.func, ast.Name) and len(
                x.exc.args) == 1 and x.exc.func.id == 'Exception':
        res = ts.ThrowStatement(ts.NewCall(ts.Name('Error'), x.exc.args))
    else:
        res = ts.ThrowStatement(x.exc)

    return res


def _normalize_name(n):
    if n.startswith('d_'):
        n = n.replace('d_', '$')
    elif n.startswith('dd_'):
        n = n.replace('dd_', '$$')
    elif not n.startswith('_') and n.endswith('_'):
        n = n[:-1]
    return n


def _normalize_dict_keys(_, ks):
    r = []
    for k in ks:
        if isinstance(k, str):
            k = ast.Str(k)
        elif isinstance(k, ts.Str):
            k = ast.Str(k.args[0])
        if not isinstance(k, ast.Str):
            k = ts.KeySubscript(k)
        r.append(k)
    return r


def _build_call_isinstance(tgt, cls_or_seq):
    """Helper to build the translate the equivalence of ``isinstance(foo, Bar)``
    to ``foo instanceof Bar`` and ``isinstance(Foo, (Bar, Zoo))`` to
    ``foo instanceof Bar || foo instanceof Zoo``.
    """
    if isinstance(cls_or_seq, (ast.Tuple, ast.List, ast.Set)):
        classes = cls_or_seq.elts
        args = tuple((tgt, c) for c in classes)
        return ts.MultipleArgsOp(ts.OpInstanceof(), ts.OpOr(), *args)
    else:
        cls = cls_or_seq
        if isinstance(cls, ast.Name) and cls.id == 'str':
            return ts.MultipleArgsOp(
                (ts.OpStrongEq(), ts.OpInstanceof()), ts.OpOr(),
                (ts.UnaryOp(ts.OpTypeof(), tgt), ts.Str('string')),
                (tgt, ts.Name('String')))
        elif isinstance(cls, ast.Name) and cls.id in ['int', 'float']:
            return ts.MultipleArgsOp(
                (ts.OpStrongEq(), ts.OpInstanceof()), ts.OpOr(),
                (ts.UnaryOp(ts.OpTypeof(), tgt), ts.Str('number')),
                (tgt, ts.Name('Number')))
        else:
            return ts.BinOp(tgt, ts.OpInstanceof(), cls)
