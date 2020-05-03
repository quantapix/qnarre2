import ast
import inspect
import textwrap

from meta.asttools import str_ast

from . import ts
from .transform import Transformer


def ast_object(obj):
    src = inspect.getsource(obj)
    node = ast.parse(textwrap.dedent(src)).body[0]
    return node


def ast_dump_object(obj, first_stmt_only=False):
    node = ast_object(obj)
    if first_stmt_only:
        node = node.body[0]
    return node, str_ast(node)


def ast_object_to_js(obj):
    src = inspect.getsource(obj)
    node = ast.parse(textwrap.dedent(src))
    t = Transformer()
    return t.xform_tree(node)


def ast_dump_file(fname):
    with open(fname) as f:
        return ast_dumps(f.read(), filename=fname)


def ast_dumps(input, filename='', first_stmt_only=False):
    node = ast.parse(input, filename=filename)
    if first_stmt_only:
        node = node.body[0]
    if str_ast:
        dump = str_ast(node)
    else:
        dump = ""
    return node, dump
