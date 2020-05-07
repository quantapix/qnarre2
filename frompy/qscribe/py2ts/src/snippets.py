import ast


def in_es6(left, right):
    if isinstance(right, ast.Array) or type(right) == str:
        return right.indexOf(left) > -1
    elif isinstance(right, (ast.Map, ast.Set, ast.WeakMap, ast.WeakSet)):
        return right.has(left)
    else:
        return left in right


def set_decorators(cls, props):
    for p in dict(props):
        decos = props[p]

        def reducer(val, deco):
            return deco(val, cls, p)

        deco = decos.reduce(reducer, cls.prototype[p])
        if (
            not isinstance(deco, (ast.Function, ast.Map, ast.WeakMap))
            and isinstance(deco, ast.Object)
            and (("value" in deco) or ("get" in deco))
        ):
            del cls.prototype[p]
            ast.Object.defineProperty(cls.prototype, p, deco)
        else:
            cls.prototype[p] = deco


def set_class_decorators(cls, decos):
    def reducer(val, deco):
        return deco(val, cls)

    return decos.reduce(reducer, cls)


def set_properties(cls, props):
    for p in dict(props):
        value = props[p]
        if (
            not isinstance(value, (ast.Map, ast.WeakMap))
            and isinstance(value, ast.Object)
            and "get" in value
            and isinstance(value.get, ast.Function)
        ):
            desc = value
        else:
            desc = {
                "value": value,
                "enumerable": False,
                "configurable": True,
                "writable": True,
            }
        ast.Object.defineProperty(cls.prototype, p, desc)
