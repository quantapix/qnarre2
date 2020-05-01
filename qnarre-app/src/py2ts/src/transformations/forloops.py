import ast

from ..js_ast import (
    TSAssignmentExpression,
    TSAttribute,
    TSAugAssignStatement,
    TSBinOp,
    TSCall,
    TSExpressionStatement,
    TSForStatement,
    TSForeachStatement,
    TSForofStatement,
    TSIfStatement,
    TSName,
    TSNum,
    TSOpAdd,
    TSOpLt,
    TSStatements,
    TSSubscript,
    TSVarStatement,
)


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
            start = TSNum(0)
            bound = x.iter.args[0]
            step = TSNum(1)
        elif len(x.iter.args) == 2:
            start = x.iter.args[0]
            bound = x.iter.args[1]
            step = TSNum(1)
        else:
            start = x.iter.args[0]
            bound = x.iter.args[1]
            step = x.iter.args[2]

        bound_name = t.new_name()

        return TSForStatement(
            TSVarStatement([name.id, bound_name], [start, bound]),
            TSBinOp(TSName(name.id), TSOpLt(), TSName(bound_name)),
            TSAugAssignStatement(TSName(name.id), TSOpAdd(), step), body)


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
                TSIfStatement(
                    TSCall(TSAttribute(TSName(dict_), 'hasOwnProperty'),
                           [TSName(name.id)]), body, None)
            ]
        # set the incoming py_node for the sourcemap
        loop = TSForeachStatement(name.id, TSName(dict_), body)
        loop.py_node = x

        return TSStatements(TSVarStatement([dict_], [expr], unmovable=True),
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
        t.es6_guard(x, 'for...of statement requires ES6')

        expr = x.iter.args[0]
        body = x.body
        target = x.target

        # set the incoming py_node for the sourcemap
        return TSForofStatement(
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

    return TSForStatement(
        TSVarStatement(
            [name.id, ix, arr, length],
            [None, TSNum(0), expr,
             TSAttribute(TSName(arr), 'length')],
            unmovable=True), TSBinOp(TSName(ix), TSOpLt(), TSName(length)),
        TSExpressionStatement(
            TSAugAssignStatement(TSName(ix), TSOpAdd(), TSNum(1))), [
                TSExpressionStatement(
                    TSAssignmentExpression(
                        TSName(name.id), TSSubscript(TSName(arr), TSName(ix))))
            ] + body)


For = [For_range, For_dict, For_iterable, For_default]
