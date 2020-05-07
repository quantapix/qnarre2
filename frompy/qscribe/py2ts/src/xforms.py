import re
import ast
from functools import reduce
from unicodedata import lookup
from macropy.core.quotes import ast_literal, ast_list, q
from macropy.experimental.pattern import switch

from . import ts
from . import transform as xf


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


def Expr_default(t, x):
    return ts.ExpressionStatement(x.value)


def Dict(t, x):
    return ts.Dict(_normalize_dict_keys(t, x.keys), x.values)


def Lambda(t, x):
    assert not any(
        getattr(x.args, k)
        for k in ["vararg", "kwonlyargs", "kwarg", "defaults", "kw_defaults"]
    )
    return ts.ArrowFunction(
        None, [arg.arg for arg in x.args.args], [ts.ReturnStatement(x.body)]
    )


def IfExp(t, x):
    return ts.IfExp(x.test, x.body, x.orelse)


def Call_default(t, x, operator=None):
    kwkeys = []
    kwvalues = []
    if x.keywords:
        for kw in x.keywords:
            t.unsupported(x, kw.arg is None, "'**kw' syntax isn't " "supported")
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
        return ts.Subscript(ts.Call(ts.Attribute(x.value, "slice"), [v]), ts.Num(0))
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
            t.unsupported(
                x, value.conversion != -1, "f-string conversion spec isn't supported"
            )
            t.unsupported(
                x, value.format_spec is not None, "f-string format spec isn't supported"
            )
            chunks.append("${%s}" % t._transform_node(value.value))
    return ts.TemplateLiteral("".join(chunks))


def Name_default(t, x):
    # {True,False,None} are Names
    cls = {"True": ts.LTrue, "False": ts.LFalse, "None": ts.Null,}.get(x.id)
    if cls:
        return cls()
    else:
        n = x.id
        n = _normalize_name(n)
        return ts.Name(n)


def NameConstant(t, x):
    cls = {True: ts.LTrue, False: ts.LFalse, None: ts.Null,}[x.value]
    return cls()


def Constant(t, x):
    if isinstance(x.value, bool) or x.value is None:
        return NameConstant(t, x)
    elif isinstance(x.value, (int, float, complex)):
        return Num(t, x)
    elif isinstance(x.value, str):
        return Str(t, x)
    else:
        raise ValueError("Unknown data type received.")


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
        return ts.Call(ts.Attribute(ts.Name("Math"), "pow"), [x.left, x.right])


BinOp = [BinOp_pow, BinOp_default]


def Name_self(t, x):
    if x.id == "self":
        return ts.This()


Name = [Name_self, Name_default]


def Call_typeof(t, x):
    if isinstance(x.func, ast.Name) and x.func.id == "typeof":
        assert len(x.args) == 1
        return ts.UnaryOp(ts.OpTypeof(), x.args[0])


def Call_callable(t, x):
    """Translate ``callable(foo)`` to ``foo instanceof Function``."""
    if isinstance(x.func, ast.Name) and x.func.id == "callable":
        assert len(x.args) == 1
        return ts.BinOp(
            ts.BinOp(x.args[0], ts.OpInstanceof(), ts.Name("Function")),
            ts.OpOr(),
            ts.BinOp(
                ts.UnaryOp(ts.OpTypeof(), x.args[0]),
                ts.OpStrongEq(),
                ts.Str("function"),
            ),
        )


def Call_import(t, x):
    if isinstance(x.func, ast.Name) and x.func.id == "__import__":
        assert len(x.args) == 1 and isinstance(x.args[0], ast.Str)
        return ts.DependImport(x.args[0].s)


def Call_type(t, x):
    if isinstance(x.func, ast.Name) and x.func.id == "type":
        assert len(x.args) == 1
        return ts.Call(ts.Attribute(ts.Name("Object"), "getPrototypeOf"), x.args)


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
    if (
        isinstance(x.func, ast.Attribute)
        and x.func.attr == "update"
        and isinstance(x.func.value, ast.Call)
        and isinstance(x.func.value.func, ast.Name)
        and x.func.value.func.id == "dict"
        and len(x.func.value.args) == 1
    ):
        return ts.Call(
            ts.Attribute(ts.Name("Object"), "assign"), [x.func.value.args[0]] + x.args
        )


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
    if (
        isinstance(x.func, ast.Attribute)
        and x.func.attr == "copy"
        and isinstance(x.func.value, ast.Call)
        and isinstance(x.func.value.func, ast.Name)
        and x.func.value.func.id == "dict"
        and len(x.func.value.args) == 1
    ):
        return ts.Call(
            ts.Attribute(ts.Name("Object"), "assign"),
            (ts.Dict([], []), x.func.value.args[0]),
        )


def Call_template(t, x):
    if (isinstance(x.func, ast.Name) and x.func.id == "tmpl") and len(x.args) > 0:
        assert len(x.args) == 1
        assert isinstance(x.args[0], ast.Str)
        return ts.TemplateLiteral(x.args[0].s)


def Call_tagged_template(t, x):
    if (
        (isinstance(x.func, ast.Name) and x.func.id == "__")
        and len(x.args) > 0
        and t.parent_of(x) is not ast.Attribute
    ):
        assert 3 > len(x.args) >= 1
        assert isinstance(x.args[0], ast.Str)
        if len(x.args) == 2:
            tag = x.args[1]
        else:
            tag = ts.Name("__")
        return ts.TaggedTemplate(x.args[0].s, tag)


def Call_hasattr(t, x):
    """Translate ``hasattr(foo, bar)`` to ``bar in foo``."""
    if (isinstance(x.func, ast.Name) and x.func.id == "hasattr") and len(x.args) == 2:
        return ts.BinOp(x.args[1], ts.OpIn(), x.args[0])


def Call_getattr(t, x):
    """Translate ``getattr(foo, bar, default)`` to ``foo[bar] || default``."""
    if (isinstance(x.func, ast.Name) and x.func.id == "getattr") and 2 <= len(
        x.args
    ) < 4:
        if len(x.args) == 2:
            res = ts.Subscript(x.args[0], x.args[1])
        else:
            res = ts.BinOp(ts.Subscript(x.args[0], x.args[1]), ts.OpOr(), x.args[2])
        return res


def Call_setattr(t, x):
    """Translate ``setattr(foo, bar, value)`` to ``foo[bar] = value``."""
    if (isinstance(x.func, ast.Name) and x.func.id == "setattr") and len(x.args) == 3:
        return ts.ExpressionStatement(
            ts.AssignmentExpression(ts.Subscript(x.args[0], x.args[1]), x.args[2])
        )


def Call_TS(t, x):
    if (isinstance(x.func, ast.Name) and x.func.id == "ts.") and len(x.args) == 1:
        assert isinstance(x.args[0], ast.Str)
        return ts.Literal(x.args[0].s)


def Call_isinstance(t, x):
    if isinstance(x.func, ast.Name) and x.func.id == "isinstance":
        assert len(x.args) == 2
        return _build_call_isinstance(x.args[0], x.args[1])


def Call_issubclass(t, x):
    with switch(x):
        if ast.Call(func=ast.Name(id="issubclass"), args=[t, x]):
            tproto = q[ast_literal[t].prototype]
            if isinstance(x, (ast.Tuple, ast.List, ast.Set)):
                classes = x.elts
            else:
                classes = [x]
            prev = None
            for c in classes:
                cur = q[ast_literal[c].prototype.isPrototypeOf(ast_literal[tproto])]
                if prev is not None:
                    cur = q[ast_literal[prev] or ast_literal[cur]]
                prev = cur
            return ts.ExpressionStatement(cur)


def Call_super(t, x):
    if (
        isinstance(x.func, ast.Attribute)
        and isinstance(x.func.value, ast.Call)
        and isinstance(x.func.value.func, ast.Name)
        and x.func.value.func.id == "super"
    ):
        sup_args = x.func.value.args
        method = t.find_parent(x, ast.FunctionDef, ast.AsyncFunctionDef)
        if (
            method
            and isinstance(t.parent_of(method), ast.ClassDef)
            and len(sup_args) == 0
        ):
            if method.name == "__init__":
                result = ts.Call(ts.Super(), x.args)
            else:
                sup_method = x.func.attr
                if isinstance(method, ast.AsyncFunctionDef):
                    sup_cls = t.parent_of(method).bases[0]
                    result = ts.Call(
                        ts.Attribute(
                            ts.Attribute(
                                ts.Attribute(ts.Name(sup_cls), "prototype"),
                                _normalize_name(sup_method),
                            ),
                            "call",
                        ),
                        [ts.This()] + x.args,
                    )
                else:
                    result = ts.Call(
                        ts.Attribute(ts.Super(), _normalize_name(sup_method)), x.args
                    )
            return result


def Eq(t, x):
    return ts.OpStrongEq()


Is = Eq


def NotEq(t, x):
    return ts.OpStrongNotEq()


IsNot = NotEq

AT_PREFIX_RE = re.compile(r"^__([a-zA-Z0-9])")
INSIDE_DUNDER_RE = re.compile(r"([a-zA-Z0-9])__([a-zA-Z0-9])")

GEN_PREFIX_RE = re.compile(r"((?:[a-zA-Z][a-z]+)+)_")
SINGLE_WORD_RE = re.compile(r"([A-Z][a-z]+)")
_shortcuts = {"at": "@"}


def _notable_replacer_gen():
    last_match_end = None

    def replace_notable_name(match):
        nonlocal last_match_end
        if (last_match_end is None and match.start() == 0) or (
            isinstance(last_match_end, int) and last_match_end == match.start()
        ):
            last_match_end = match.end()
            prefix = match.group(1)
            low_prefix = prefix.lower()
            if low_prefix in _shortcuts:
                return _shortcuts[low_prefix]
            try:
                prefix = SINGLE_WORD_RE.sub(r" \1", prefix).strip()
                return lookup(prefix)
            except KeyError:
                pass
        return match.group()

    return replace_notable_name


def _replace_identifiers_with_symbols(dotted_str):
    dotted_str = AT_PREFIX_RE.sub(r"@\1", dotted_str)
    dotted_str = INSIDE_DUNDER_RE.sub(r"\1-\2", dotted_str)

    dotted_str = GEN_PREFIX_RE.sub(_notable_replacer_gen(), dotted_str)

    return dotted_str


def ImportFrom(t, x):
    names = []
    for n in x.names:
        names.append(n.asname or n.name)
    if x.module == "__globals__":
        assert x.level == 0
        # assume a fake import to import js stuff from root object
        t.add_globals(*names)
        result = ts.Pass()
    else:
        t.add_globals(*names)
        if x.module:
            mod = tuple(
                _normalize_name(frag)
                for frag in _replace_identifiers_with_symbols(x.module).split(".")
            )
            path_module = "/".join(mod)
            if x.level == 1:
                path_module = "./" + path_module
            elif x.level > 1:
                path_module = "../" * (x.level - 1) + path_module
            if len(x.names) == 1 and x.names[0].name == "__default__":
                t.unsupported(
                    x,
                    x.names[0].asname is None,
                    "Default import must declare an 'as' clause.",
                )
                result = ts.DefaultImport(path_module, x.names[0].asname)
            else:
                result = ts.NamedImport(
                    path_module, [(n.name, n.asname) for n in x.names]
                )
        else:
            assert x.level > 0
            result = []
            for n in x.names:
                if x.level == 1:
                    imp = ts.StarImport("./" + n.name, n.asname or n.name)
                else:
                    imp = ts.StarImport(
                        "../" * (x.level - 1) + n.name, n.asname or n.name
                    )
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
        from .snippets import in_es6

        t.add_snippet(in_es6)
        sname = "in_es6"
        result = ts.Call(ts.Attribute("_pj", sname), [x.left, x.comparators[0]])
        if isinstance(x.ops[0], ast.NotIn):
            result = ts.UnaryOp(ts.OpNot(), result)
        return result


Compare = [Compare_in, Compare_default]


def Subscript_slice(t, x):

    if isinstance(x.slice, ast.Slice):
        slice = x.slice
        t.unsupported(x, slice.step and slice.step != 1, "Slice step is unsupported")
        args = []
        if slice.lower:
            args.append(slice.lower)
        else:
            args.append(ts.Num(0))
        if slice.upper:
            args.append(slice.upper)

        return ts.Call(ts.Attribute(x.value, "slice"), args)


def Subscript_super(t, x):
    if (
        isinstance(x.value, ast.Call)
        and isinstance(x.value.func, ast.Name)
        and x.value.func.id == "super"
    ):
        sup_args = x.value.args
        method = t.find_parent(x, ast.FunctionDef, ast.AsyncFunctionDef)
        if (
            method
            and isinstance(t.parent_of(method), ast.ClassDef)
            and len(sup_args) == 0
        ):
            if method.name == "__init__":
                t.unsupported(
                    x, True, "'super()[expr]' cannot be used in " "constructors"
                )
            else:
                sup_method = x.slice.value
                # this becomes super[expr]
                result = ts.Subscript(ts.Super(), _normalize_name(sup_method))
            return result


Subscript = [Subscript_slice, Subscript_super, Subscript_default]


def Attribute_super(t, x):
    if (
        isinstance(x.value, ast.Call)
        and len(x.value.args) == 0
        and isinstance(x.value.func, ast.Name)
        and x.value.func.id == "super"
    ):
        sup_args = x.value.args
        method = t.find_parent(x, ast.FunctionDef, ast.AsyncFunctionDef)
        if (
            method
            and isinstance(t.parent_of(method), ast.ClassDef)
            and len(sup_args) == 0
        ):
            if method.name == "__init__":
                t.unsupported(
                    x, True, "'super().attr' cannot be used in " "constructors"
                )
            else:
                sup_method = x.attr
                # this becomes super.method
                result = ts.Attribute(ts.Super(), _normalize_name(sup_method))
            return result


def Attribute_list_append(t, x):
    if (
        x.attr == "append"
        and isinstance(x.value, ast.Call)
        and isinstance(x.value.func, ast.Name)
        and x.value.func.id == "list"
        and len(x.value.args) == 1
    ):
        return ts.Attribute(x.value.args[0], "push")


Attribute = [Attribute_super, Attribute_list_append, Attribute_default]


def ListComp(t, x):

    assert len(x.generators) == 1
    assert len(x.generators[0].ifs) <= 1
    assert isinstance(x.generators[0], ast.comprehension)
    assert isinstance(x.generators[0].target, ast.Name)

    EXPR = x.elt
    NAME = x.generators[0].target
    LIST = x.generators[0].iter
    if len(x.generators[0].ifs) == 1:
        CONDITION = x.generators[0].ifs[0]
    else:
        CONDITION = None

    __new = t.new_name()
    __old = t.new_name()
    __i = t.new_name()
    __bound = t.new_name()

    push = ts.ExpressionStatement(ts.Call(ts.Attribute(ts.Name(__new), "push"), [EXPR]))
    if CONDITION:
        push_if = ts.IfStatement(CONDITION, push, None)
    else:
        push_if = push
    forloop = ts.ForStatement(
        ts.VarStatement([__i, __bound], [0, ts.Attribute(ts.Name(__old), "length")]),
        ts.BinOp(ts.Name(__i), ts.OpLt(), ts.Name(__bound)),
        ts.AugAssignStatement(ts.Name(__i), ts.OpAdd(), ts.Num(1)),
        [
            ts.VarStatement([NAME.id], [ts.Subscript(ts.Name(__old), ts.Name(__i))]),
            push_if,
        ],
    )
    func = ts.Function(
        None,
        [],
        [
            ts.VarStatement([__new, __old], [ts.List([]), LIST]),
            forloop,
            ts.ReturnStatement(ts.Name(__new)),
        ],
    )
    invoked = ts.Call(ts.Attribute(func, "call"), [ts.This()])
    return invoked


def _isyield(el):
    return isinstance(el, (ast.Yield, ast.YieldFrom))


def FunctionDef(t, x, fwrapper=None, mwrapper=None):

    is_method = isinstance(t.parent_of(x), ast.ClassDef)
    is_in_method = (
        not x.name.startswith("fn_")
        and all(
            lambda p: isinstance(
                p, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)
            )
            for _ in t.parents(x, stop_at=ast.ClassDef)
        )
        and isinstance(tuple(t.parents(x, stop_at=ast.ClassDef))[-1], ast.ClassDef)
    )

    is_generator = reduce(
        lambda prev, cur: _isyield(cur) or prev, xf.cross_walk(x.body), False
    )

    t.unsupported(
        x,
        not is_method and x.decorator_list,
        "Function decorators are" " unsupported yet",
    )

    t.unsupported(
        x, len(x.decorator_list) > 1, "No more than one decorator" " is supported"
    )

    t.unsupported(
        x,
        x.args.kwarg and x.args.kwonlyargs,
        "Keyword arguments together with keyword args accumulator" " are unsupported",
    )

    t.unsupported(
        x,
        x.args.vararg and (x.args.kwonlyargs or x.args.kwarg),
        "Having both param accumulator and keyword args is " "unsupported",
    )

    name = _normalize_name(x.name)
    body = x.body
    # get positional arg names and trim self if present
    arg_names = [arg.arg for arg in x.args.args]
    if is_method or (len(arg_names) > 0 and arg_names[0] == "self"):
        arg_names = arg_names[1:]

    acc = ts.Rest(x.args.vararg.arg) if x.args.vararg else None
    defaults = x.args.defaults
    kw = x.args.kwonlyargs
    kwdefs = x.args.kw_defaults
    kw_acc = x.args.kwarg
    kw_names = [k.arg for k in kw]
    if kw:
        kw = []
        for k, v in zip(kw, kwdefs):
            if v is None:
                kw.append(k.arg)
            else:
                kw.append(ts.AssignmentExpression(k.arg, v))
    else:
        kw = None

    # be sure that the defaults equal in length the args list
    if isinstance(defaults, (list, tuple)) and len(defaults) < len(arg_names):
        defaults = ([None] * (len(arg_names) - len(defaults))) + list(defaults)
    elif defaults is None:
        defaults = [None] * len(arg_names)

    if kw_acc:
        arg_names += [kw_acc.arg]
        defaults += [ts.Dict((), ())]

    # render defaults of positional arguments and keywords accumulator
    args = []
    for k, v in zip(arg_names, defaults):
        if v is None:
            args.append(k)
        else:
            args.append(ts.AssignmentExpression(k, v))

    # local function vars
    if "vars" in t.ctx:
        upper_vars = t.ctx["vars"]
    else:
        upper_vars = set()
    local_vars = list(
        (set(xf.local_names(body)) - set(arg_names)) - set(kw_names) - upper_vars
    )
    t.ctx["vars"] = upper_vars | set(local_vars)
    if len(local_vars) > 0:
        local_vars.sort()
        body = ts.Statements(
            ts.VarStatement(local_vars, [None] * len(local_vars)), *body
        )

    if is_generator:
        fwrapper = ts.GenFunction
        mwrapper = ts.GenMethod

    # If x is a method
    if is_method:
        cls_member_opts = {}
        if x.decorator_list:
            fdeco = x.decorator_list[0]
            if isinstance(fdeco, ast.Name) and fdeco.id == "property":
                deco = ts.Getter
            elif (
                isinstance(fdeco, ast.Attribute)
                and fdeco.attr == "setter"
                and isinstance(fdeco.value, ast.Name)
            ):
                deco = ts.Setter
            elif isinstance(fdeco, ast.Name) and fdeco.id == "classmethod":
                deco = None
                cls_member_opts["static"] = True
            else:
                t.unsupported(x, True, "Unsupported method decorator")
        else:
            deco = None

        if name == "__init__":
            result = ts.ClassConstructor(args, body, acc, kw)
        else:
            mwrapper = mwrapper or deco or ts.Method
            if mwrapper is ts.Getter:
                result = mwrapper(name, body, **cls_member_opts)
            elif mwrapper is ts.Setter:
                t.unsupported(x, len(args) == 0, "Missing argument in setter")
                result = mwrapper(name, args[0], body, **cls_member_opts)
            elif mwrapper is ts.Method:
                if name == "__len__":
                    result = ts.Getter("length", body, **cls_member_opts)
                elif name == "__str__":
                    result = ts.Method("toString", [], body, **cls_member_opts)
                elif name == "__get__":
                    result = ts.Method("get", [], body, **cls_member_opts)
                elif name == "__set__":
                    result = ts.Method("set", [], body, **cls_member_opts)
                elif name == "__instancecheck__":
                    cls_member_opts["static"] = True
                    result = ts.Method(
                        "[Symbol.hasInstance]", args, body, **cls_member_opts
                    )
                else:
                    result = mwrapper(name, args, body, acc, kw, **cls_member_opts)
            else:
                result = mwrapper(name, args, body, acc, kw, **cls_member_opts)
    else:
        if is_in_method and fwrapper is None:
            fdef = ts.ArrowFunction(name, args, body, acc, kw)
            fdef.py_node = x
            result = ts.Statements(ts.VarStatement([str(name)], [None]), fdef)
        elif is_in_method and fwrapper in [ts.GenFunction, ts.AsyncFunction]:
            fdef = fwrapper(name, args, body, acc, kw)
            fdef.py_node = x
            result = ts.Statements(
                fdef,
                ts.ExpressionStatement(
                    ts.AssignmentExpression(
                        ts.Name(name), ts.Call(ts.Attribute(name, "bind"), [ts.This()])
                    )
                ),
            )
        else:
            fwrapper = fwrapper or ts.Function
            result = fwrapper(name, args, body, acc, kw)
    return result


def AsyncFunctionDef(t, x):
    return FunctionDef(t, x, ts.AsyncFunction, ts.AsyncMethod)


EXC_TEMPLATE = """\
class %(name)s(Error):

    def __init__(self, message):
        self.name = '%(name)s'
        self.message = message or 'Error'
"""

EXC_TEMPLATE_ES5 = """\
def %(name)s(self, message):
    self.name = '%(name)s'
    self.message = message or 'Custom error %(name)s'
    if typeof(Error.captureStackTrace) == 'function':
        Error.captureStackTrace(self, self.constructor)
    else:
        self.stack = Error(message).stack

%(name)s.prototype = Object.create(Error.prototype)
%(name)s.prototype.constructor = %(name)s
"""


def _isdoc(el):
    return isinstance(el, ast.Expr) and isinstance(el.value, ast.Str)


def ClassDef_default(t, x):
    """Convert a class to an ES6 class."""
    _class_guards(t, x)
    name = x.name
    body = x.body
    if len(x.bases) > 0:
        superclass = x.bases[0]
    else:
        superclass = None
    fn_body = [
        e for e in body if isinstance(e, (ast.FunctionDef, ast.AsyncFunctionDef))
    ]
    assigns = [e for e in body if isinstance(e, assign_types)]
    for node in fn_body:
        arg_names = [arg.arg for arg in node.args.args]
        t.unsupported(
            node,
            len(arg_names) == 0 or arg_names[0] != "self",
            "First arg on method must be 'self'",
        )
    if len(fn_body) > 0 and fn_body[0].name == "__init__":
        init = body[0]
        for stmt in xf.ast_walk(init):
            assert not isinstance(stmt, ast.Return)
    decos = {}
    for fn in fn_body:
        if fn.decorator_list and not (
            (
                len(fn.decorator_list) == 1
                and isinstance(fn.decorator_list[0], ast.Name)
                and fn.decorator_list[0].id
                in ["property", "classmethod", "staticmethod"]
            )
            or (
                isinstance(fn.decorator_list[0], ast.Attribute)
                and fn.decorator_list[0].attr == "setter"
            )
        ):
            decos[fn.name] = (ts.Str(fn.name), fn.decorator_list)
            fn.decorator_list = []
    if _isdoc(body[0]):
        fn_body = [body[0]] + fn_body
    cls = ts.Class(ts.Name(name), superclass, fn_body)
    cls.py_node = x
    stmts = [cls]

    def _from_assign_to_dict_item(e):
        key = xf.assign_targets(e)[0]
        value = e.value
        if isinstance(key, ast.Name):
            rendered_key = ast.Str(_normalize_name(key.id))
            sort_key = key.id
        else:
            rendered_key = key
            sort_key = "~"
        return sort_key, rendered_key, value

    assigns = tuple(
        zip(*sorted(map(_from_assign_to_dict_item, assigns), key=lambda e: e[0]))
    )
    if assigns:
        from .snippets import set_properties

        t.add_snippet(set_properties)
        assigns = ts.ExpressionStatement(
            ts.Call(
                ts.Attribute(ts.Name("_pj"), "set_properties"),
                (
                    ts.Name(name),
                    ts.Dict(_normalize_dict_keys(t, assigns[1]), assigns[2]),
                ),
            )
        )
        stmts.append(assigns)
    if decos:
        from .snippets import set_decorators

        t.add_snippet(set_decorators)
        keys = []
        values = []
        for k, v in sorted(decos.items(), key=lambda i: i[0]):
            rendered_key, dlist = v
            keys.append(rendered_key)
            values.append(ts.List(dlist))
        decos = ts.ExpressionStatement(
            ts.Call(
                ts.Attribute(ts.Name("_pj"), "set_decorators"),
                (ts.Name(name), ts.Dict(_normalize_dict_keys(t, keys), values)),
            )
        )
        stmts.append(decos)
    if x.decorator_list:
        from .snippets import set_class_decorators

        t.add_snippet(set_class_decorators)
        with q as cls_decos:
            name[name] = set_class_decorators(name[name], ast_list[x.decorator_list])
        stmts.append(ts.ExpressionStatement(cls_decos[0]))
    return ts.Statements(*stmts)


ClassDef = [ClassDef_default]


def _normalize_name(n):
    if n.startswith("d_"):
        n = n.replace("d_", "$")
    elif n.startswith("dd_"):
        n = n.replace("dd_", "$$")
    elif not n.startswith("_") and n.endswith("_"):
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
        if isinstance(cls, ast.Name) and cls.id == "str":
            return ts.MultipleArgsOp(
                (ts.OpStrongEq(), ts.OpInstanceof()),
                ts.OpOr(),
                (ts.UnaryOp(ts.OpTypeof(), tgt), ts.Str("string")),
                (tgt, ts.Name("String")),
            )
        elif isinstance(cls, ast.Name) and cls.id in ["int", "float"]:
            return ts.MultipleArgsOp(
                (ts.OpStrongEq(), ts.OpInstanceof()),
                ts.OpOr(),
                (ts.UnaryOp(ts.OpTypeof(), tgt), ts.Str("number")),
                (tgt, ts.Name("Number")),
            )
        else:
            return ts.BinOp(tgt, ts.OpInstanceof(), cls)
