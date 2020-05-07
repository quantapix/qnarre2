import argparse
import ast
import collections as co
import inspect
import os
import pathlib as pth
import textwrap
import dukpy

from .transform import Transformer
from .ts import Block


def output(src):
    src = os.path.abspath(src)
    dst_dir = os.path.dirname(src)
    name = os.path.basename(os.path.splitext(src)[0])
    dst = os.path.join(dst_dir, name + ".ts")
    return dst


def translate(src):
    dst = output(src)
    src = open(src).readlines()
    js_text = xform(src)
    with open(dst, "w") as dst:
        dst.write(js_text)


def translate_object(py):
    cwd = os.getcwd()
    src = os.path.abspath(inspect.getsourcefile(py))
    pre = os.path.commonpath((cwd, src))
    if len(pre) > 1:
        src = src[len(pre) + 1 :]
    ls = inspect.getsourcelines(py)
    return translate(ls)


def eval_object(py, append=None, ret_code=False, **kw):
    ts, _ = translate_object(py)
    if append:
        ts += append
    r = dukpy.evaljs(ts, **kw)
    if ret_code:
        r = (r, ts)
    return r


def xform(src, dedent=True):
    if isinstance(src, (tuple, list)):
        src = "".join(src)
    if dedent:
        dedented = textwrap.dedent(src)
    else:
        dedented = src
    t = Transformer()
    py = ast.parse(dedented)
    ts = t.xform_tree(py)
    if t.snippets:
        snipast = t.xform_snippets()
        snipast += ts
        ts = snipast
    b = Block(ts)
    return b.read()


def evals(py_text, ret_code=False, **kwargs):
    js_text, _ = xform(py_text)
    res = dukpy.evaljs(js_text, **kwargs)
    if ret_code:
        res = (res, js_text)
    return res


def eval_object_es6(
    py_obj, append=None, body_only=False, ret_code=False, enable_stage3=False, **kwargs
):
    es5_text, _ = transpile_object(py_obj, body_only, enable_stage3=enable_stage3)
    if append:
        es5_text += "\n" + append
    res = dukpy.evaljs(es5_text, load_es6_polyfill=True, **kwargs)
    if ret_code:
        res = (res, es5_text)
    return res


def evals_es6(py_text, body_only=False, ret_code=False, enable_stage3=False, **kwargs):
    es5_text, _ = transpile_pys(
        py_text, body_only=body_only, enable_stage3=enable_stage3
    )
    res = evaljs(es5_text, load_es6_polyfill=True, **kwargs)
    if ret_code:
        res = (res, es5_text)
    return res


def main(args, fout=None, ferr=None):
    assert args.files
    for f in args.files:
        s = pth.Path(f)
        assert s.exists()
        if s.is_dir():
            dirs = co.deque([s])
            while len(dirs) > 0:
                sdir = dirs.popleft()
                for p in sdir.iterdir():
                    if s.name in ("__pycache__", "__init__.py"):
                        continue
                    elif s.is_dir():
                        dirs.append(p)
                    elif p.suffix == ".py":
                        try:
                            translate(str(p))
                            print("Compiled file %s" % p)
                        except Exception as e:
                            e.src_fname = p
                            raise
        else:
            try:
                translate(f)
                print("Compiled file %s" % f)
            except Exception as e:
                e.src_fname = f
                raise


if __name__ == "__main__":
    p = argparse.ArgumentParser(
        description="A Python 3.5+ to ES6 TypeScript compiler", prog="pj"
    )
    p.add_argument(
        "files",
        metavar="file",
        type=str,
        nargs="*",
        help="Python source file(s) or directory(ies) "
        "to convert. When it is a directory it will be "
        "converted recursively",
    )
    main(p.parse_args())
