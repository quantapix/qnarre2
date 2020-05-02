import ast
import logging

import macropy.activate

from ..js_ast import TSKeySubscript, TSStr, Target

logger = logging.getLogger(__name__)


def _normalize_name(n):
    if n.startswith('d_'):
        n = n.replace('d_', '$')
    elif n.startswith('dd_'):
        n = n.replace('dd_', '$$')
    # allow to reference names that are Python's keywords by appending
    # a dash to them
    elif not n.startswith('_') and n.endswith('_'):
        n = n[:-1]
    return n


def _normalize_dict_keys(transformer, keys):
    res = []
    for key in keys:
        if isinstance(key, str):
            key = ast.Str(key)
        elif isinstance(key, TSStr):
            key = ast.Str(key.args[0])
        if not isinstance(key, ast.Str):
            key = TSKeySubscript(key)
        res.append(key)
    return res
