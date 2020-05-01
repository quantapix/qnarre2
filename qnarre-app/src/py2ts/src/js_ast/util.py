JS_KEYWORDS = set([
    'break', 'case', 'catch', 'continue', 'default', 'delete', 'do', 'else',
    'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new', 'return',
    'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with',
    'abstract', 'boolean', 'byte', 'char', 'class', 'const', 'double', 'enum',
    'export', 'extends', 'final', 'float', 'goto', 'implements', 'import',
    'int', 'interface', 'long', 'native', 'package', 'private', 'protected',
    'public', 'short', 'static', 'super', 'synchronized', 'throws',
    'transient', 'volatile'
])

JS_KEYWORDS_ES6 = JS_KEYWORDS - set(['delete'])


def _check_keywords(target_node, name):
    trans = target_node.transformer
    if trans is not None:
        trans.unsupported(target_node.py_node,
                          (name in JS_KEYWORDS_ES6
                           if trans.enable_es6 else name in JS_KEYWORDS),
                          "Name '%s' is reserved in JavaScript." % name)
    else:
        if name in JS_KEYWORDS:
            raise ValueError("Name %s is reserved in JavaScript." % name)
