import argparse
from collections import deque
import logging
import pathlib as pth
import sys
import ast
import os
import textwrap

from .processor.transforming import Transformer
from .processor.util import Block
from .ts import Statements
from . import transformations
import inspect

log = logging.getLogger(__name__)


def output(src):
    src = os.path.abspath(src)
    dst_dir = os.path.dirname(src)
    name = os.path.basename(os.path.splitext(src)[0])
    dst = os.path.join(dst_dir, name + '.ts')
    return dst


def translate(src):
    dst = output(src)
    src = open(src).readlines()
    js_text = translate(src)
    with open(dst, 'w') as dst:
        dst.write(js_text)


def translate_object(py_obj):
    cwd = os.getcwd()
    src = os.path.abspath(inspect.getsourcefile(py_obj))
    prefix = os.path.commonpath((cwd, src))
    if len(prefix) > 1:
        src = src[len(prefix) + 1:]
    lines = inspect.getsourcelines(py_obj)
    return translate(lines)


def translate(src, dedent=True):
    if isinstance(src, (tuple, list)):
        src = ''.join(src)
    if dedent:
        dedented = textwrap.dedent(src)
    else:
        dedented = src
    t = Transformer(transformations, Statements)
    py = ast.parse(dedented)
    ts = t.transform_code(py)
    if t.snippets:
        snipast = t.transform_snippets()
        snipast += ts
        ts = snipast
    b = Block(ts)
    return b.read()


def main(args, fout=None, ferr=None):
    assert args.files
    for f in args.files:
        s = pth.Path(f)
        assert s.exists()
        if s.is_dir():
            dirs = deque([s])
            while len(dirs) > 0:
                sdir = dirs.popleft()
                for p in sdir.iterdir():
                    if s.name in ('__pycache__', '__init__.py'):
                        continue
                    elif s.is_dir():
                        dirs.append(p)
                    elif p.suffix == '.py':
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


if __name__ == '__main__':
    p = argparse.ArgumentParser(
        description="A Python 3.5+ to ES6 TypeScript compiler", prog='pj')
    p.add_argument('files',
                   metavar='file',
                   type=str,
                   nargs='*',
                   help="Python source file(s) or directory(ies) "
                   "to convert. When it is a directory it will be "
                   "converted recursively")
    main(p.parse_args())
