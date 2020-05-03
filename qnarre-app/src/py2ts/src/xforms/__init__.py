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


def _normalize_dict_keys(_, ks):
    r = []
    for k in ks:
        if isinstance(k, str):
            k = ast.Str(k)
        elif isinstance(k, TSStr):
            k = ast.Str(k.args[0])
        if not isinstance(k, ast.Str):
            k = TSKeySubscript(k)
        r.append(k)
    return r
