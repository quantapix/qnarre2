import ast

from ..ts import (
    TSAttribute,
    TSAugAssignStatement,
    TSBinOp,
    TSCall,
    TSExpressionStatement,
    TSForStatement,
    TSFunction,
    TSIfStatement,
    TSList,
    TSName,
    TSNum,
    TSOpAdd,
    TSOpLt,
    TSReturnStatement,
    TSSubscript,
    TSThis,
    TSVarStatement,
)


#### ListComp
# Transform
# <pre>[EXPR for NAME in LIST]</pre>
# or
# <pre>[EXPR for NAME in LIST if CONDITION]</pre>
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

    # Let's contruct the result from the inside out:
    #<pre>__new.push(EXPR);</pre>
    push = TSExpressionStatement(
        TSCall(TSAttribute(TSName(__new), 'push'), [EXPR]))

    # If needed, we'll wrap that with:
    #<pre>if (CONDITION) {
    #    <i>...push...</i>
    #}</pre>
    if CONDITION:
        pushIfNeeded = TSIfStatement(CONDITION, push, None)
    else:
        pushIfNeeded = push

    # Wrap with:
    #<pre>for(
    #        var __i = 0, __bound = __old.length;
    #        __i &lt; __bound;
    #        __i++) {
    #    var NAME = __old[__i];
    #    <i>...pushIfNeeded...</i>
    #}</pre>
    forloop = TSForStatement(
        TSVarStatement([__i, __bound],
                       [0, TSAttribute(TSName(__old), 'length')]),
        TSBinOp(TSName(__i), TSOpLt(), TSName(__bound)),
        TSAugAssignStatement(TSName(__i), TSOpAdd(), TSNum(1)), [
            TSVarStatement([NAME.id],
                           [TSSubscript(TSName(__old), TSName(__i))]),
            pushIfNeeded
        ])

    # Wrap with:
    #<pre>function() {
    #    var __new = [], __old = LIST;
    #    <i>...forloop...</i>
    #    return __new;
    #}
    func = TSFunction(None, [], [
        TSVarStatement([__new, __old], [TSList([]), LIST]), forloop,
        TSReturnStatement(TSName(__new))
    ])

    # And finally:
    #<pre>((<i>...func...</i>).call(this))</pre>
    invoked = TSCall(TSAttribute(func, 'call'), [TSThis()])

    return invoked
