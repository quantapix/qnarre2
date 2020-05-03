import ast


def in_es6(left, right):
    if isinstance(right, ast.Array) or typeof(right) == 'string':
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
        if not isinstance(deco, (Function, Map, WeakMap)) and isinstance(
                deco, Object) and (('value' in deco) or ('get' in deco)):
            del cls.prototype[p]
            Object.defineProperty(cls.prototype, p, deco)
        else:
            cls.prototype[p] = deco


def set_class_decorators(cls, decos):
    def reducer(val, deco):
        return deco(val, cls)

    return decos.reduce(reducer, cls)


def set_properties(cls, props):
    for p in dict(props):
        value = props[p]
        if not isinstance(value, (Map, WeakMap)) and isinstance(
                value, Object) and 'get' in value and isinstance(
                    value.get, Function):
            desc = value
        else:
            desc = {
                'value': value,
                'enumerable': False,
                'configurable': True,
                'writable': True
            }
        Object.defineProperty(cls.prototype, p, desc)


def _assert(comp, msg):
    def PJAssertionError(self, message):
        self.name = 'PJAssertionError'
        self.message = message or 'Custom error PJAssertionError'
        if typeof(Error.captureStackTrace) == 'function':
            Error.captureStackTrace(self, self.constructor)
        else:
            self.stack = Error(message).stack

    PJAssertionError.prototype = Object.create(Error.prototype)
    PJAssertionError.prototype.constructor = PJAssertionError

    msg = msg or 'Assertion failed.'
    if not comp:
        raise PJAssertionError(msg)
