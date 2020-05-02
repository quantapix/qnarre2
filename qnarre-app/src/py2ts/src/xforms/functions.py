# -*- coding: utf-8 -*-
# :Project:  metapensiero.pj -- function transformations
# :Created:  mer 09 nov 2016 12:59:00 CET
# :Authors:  Andrew Schaaf <andrew@andrewschaaf.com>,
#            Alberto Berti <alberto@metapensiero.it>
# :License:  GNU General Public License version 3 or later
#

import ast
from functools import reduce

from ..js_ast import (
    TSAttribute,
    TSArrowFunction,
    TSAssignmentExpression,
    TSAsyncFunction,
    TSAsyncMethod,
    TSCall,
    TSClassConstructor,
    TSDict,
    TSExpressionStatement,
    TSFunction,
    TSGenFunction,
    TSGenMethod,
    TSGetter,
    TSMethod,
    TSName,
    TSRest,
    TSSetter,
    TSStatements,
    TSThis,
    TSVarStatement,
)
from ..processor.util import body_local_names, walk_under_code_boundary

from . import _normalize_name


def _isyield(el):
    return isinstance(el, (ast.Yield, ast.YieldFrom))


def FunctionDef(t, x, fwrapper=None, mwrapper=None):

    is_method = isinstance(t.parent_of(x), ast.ClassDef)
    is_in_method = not x.name.startswith('fn_') and \
                   all(lambda p: isinstance(p, (ast.FunctionDef,
                                                ast.AsyncFunctionDef,
                                                ast.ClassDef)) \
                       for p in t.parents(x, stop_at=ast.ClassDef)) and \
                           isinstance(tuple(t.parents(x, stop_at=ast.ClassDef))[-1],
                                      ast.ClassDef) # Make sure a class is there

    is_generator = reduce(lambda prev, cur: _isyield(cur) or prev,
                          walk_under_code_boundary(x.body), False)

    t.unsupported(x, not is_method and x.decorator_list,
                  "Function decorators are"
                  " unsupported yet")

    t.unsupported(x,
                  len(x.decorator_list) > 1, "No more than one decorator"
                  " is supported")

    t.unsupported(
        x, x.args.kwarg and x.args.kwonlyargs,
        "Keyword arguments together with keyword args accumulator"
        " are unsupported")

    t.unsupported(
        x, x.args.vararg and (x.args.kwonlyargs or x.args.kwarg),
        "Having both param accumulator and keyword args is "
        "unsupported")

    name = _normalize_name(x.name)
    body = x.body
    # get positional arg names and trim self if present
    arg_names = [arg.arg for arg in x.args.args]
    if is_method or (len(arg_names) > 0 and arg_names[0] == 'self'):
        arg_names = arg_names[1:]

    acc = TSRest(x.args.vararg.arg) if x.args.vararg else None
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
                kw.append(TSAssignmentExpression(k.arg, v))
    else:
        kw = None

    # be sure that the defaults equal in length the args list
    if isinstance(defaults, (list, tuple)) and len(defaults) < len(arg_names):
        defaults = ([None] * (len(arg_names) - len(defaults))) + list(defaults)
    elif defaults is None:
        defaults = [None] * len(arg_names)

    if kw_acc:
        arg_names += [kw_acc.arg]
        defaults += [TSDict((), ())]

    # render defaults of positional arguments and keywords accumulator
    args = []
    for k, v in zip(arg_names, defaults):
        if v is None:
            args.append(k)
        else:
            args.append(TSAssignmentExpression(k, v))

    # local function vars
    if 'vars' in t.ctx:
        upper_vars = t.ctx['vars']
    else:
        upper_vars = set()
    local_vars = list((set(body_local_names(body)) - set(arg_names)) -
                      set(kw_names) - upper_vars)
    t.ctx['vars'] = upper_vars | set(local_vars)
    if len(local_vars) > 0:
        local_vars.sort()
        body = TSStatements(
            TSVarStatement(local_vars, [None] * len(local_vars)), *body)

    if is_generator:
        fwrapper = TSGenFunction
        mwrapper = TSGenMethod

    # If x is a method
    if is_method:
        cls_member_opts = {}
        if x.decorator_list:
            # decorator should be "property" or "<name>.setter" or "classmethod"
            fdeco = x.decorator_list[0]
            if isinstance(fdeco, ast.Name) and fdeco.id == 'property':
                deco = TSGetter
            elif (isinstance(fdeco, ast.Attribute) and fdeco.attr == 'setter'
                  and isinstance(fdeco.value, ast.Name)):
                deco = TSSetter
            elif isinstance(fdeco, ast.Name) and fdeco.id == 'classmethod':
                deco = None
                cls_member_opts['static'] = True
            else:
                t.unsupported(x, True, "Unsupported method decorator")
        else:
            deco = None

        if name == '__init__':
            result = TSClassConstructor(args, body, acc, kw)
        else:
            mwrapper = mwrapper or deco or TSMethod
            if mwrapper is TSGetter:
                result = mwrapper(name, body, **cls_member_opts)
            elif mwrapper is TSSetter:
                t.unsupported(x, len(args) == 0, "Missing argument in setter")
                result = mwrapper(name, args[0], body, **cls_member_opts)
            elif mwrapper is TSMethod:
                if name == '__len__':
                    result = TSGetter('length', body, **cls_member_opts)
                elif name == '__str__':
                    result = TSMethod('toString', [], body, **cls_member_opts)
                elif name == '__get__':
                    result = TSMethod('get', [], body, **cls_member_opts)
                elif name == '__set__':
                    result = TSMethod('set', [], body, **cls_member_opts)
                elif name == '__instancecheck__':
                    cls_member_opts['static'] = True
                    result = TSMethod('[Symbol.hasInstance]', args, body,
                                      **cls_member_opts)
                else:
                    result = mwrapper(name, args, body, acc, kw,
                                      **cls_member_opts)
            else:
                result = mwrapper(name, args, body, acc, kw, **cls_member_opts)
    # x is a function
    else:
        if is_in_method and fwrapper is None:
            fdef = TSArrowFunction(name, args, body, acc, kw)
            fdef.py_node = x
            result = TSStatements(TSVarStatement([str(name)], [None]), fdef)
        elif is_in_method and fwrapper in [TSGenFunction, TSAsyncFunction]:
            fdef = fwrapper(name, args, body, acc, kw)
            fdef.py_node = x
            # arrow functions cannot be generators, render them as normal
            # function and add a bind(self)
            result = TSStatements(
                fdef,
                TSExpressionStatement(
                    TSAssignmentExpression(
                        TSName(name),
                        TSCall(TSAttribute(name, 'bind'), [TSThis()]))))
        else:
            fwrapper = fwrapper or TSFunction
            result = fwrapper(name, args, body, acc, kw)
    return result


def AsyncFunctionDef(t, x):
    return FunctionDef(t, x, TSAsyncFunction, TSAsyncMethod)
