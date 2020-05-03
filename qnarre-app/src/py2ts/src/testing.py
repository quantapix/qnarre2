import ast
import inspect
import textwrap

from meta.asttools import str_ast

from .transform import Transformer


def ast_node(obj):
    s = inspect.getsource(obj)
    n = ast.parse(textwrap.dedent(s)).body[0]
    return n


def ast_dump_node(obj, first=False):
    n = ast_node(obj)
    if first:
        n = n.body[0]
    return n, str_ast(n)


def ast_to_ts(obj):
    s = inspect.getsource(obj)
    n = ast.parse(textwrap.dedent(s))
    t = Transformer()
    return t.xform_tree(n)


def ast_dump_file(name):
    with open(name) as f:
        return ast_dumps(f.read(), name=name)


def ast_dumps(input, name='', first=False):
    n = ast.parse(input, filename=name)
    if first:
        n = n.body[0]
    d = str_ast(n)
    return n, d
