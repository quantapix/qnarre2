import argparse
from collections import deque
import logging
from pathlib import Path
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


class UnsupportedPythonError(Exception):
    """Exception raised if the running interpreter version is
    unsupported.
    """


parser = argparse.ArgumentParser(
    description="A Python 3.5+ to ES6 TypeScript compiler", prog='pj')
parser.add_argument('files',
                    metavar='file',
                    type=str,
                    nargs='*',
                    help="Python source file(s) or directory(ies) "
                    "to convert. When it is a directory it will be "
                    "converted recursively")
parser.add_argument('-o',
                    '--output',
                    type=str,
                    help="Output file/directory where to save the generated "
                    "code")
parser.add_argument('--dump-ast',
                    action='store_true',
                    help="Dump the Python AST. You need to have the package"
                    " metapensiero.pj[test] installed")


class Reporter:
    def __init__(self, fout=None, ferr=None):
        self.fout = fout or sys.stdout
        self.ferr = ferr or sys.stderr

    def print_err(self, *args, **kw):
        kw['file'] = self.ferr
        print(*args, **kw)

    def print(self, *args, **kw):
        kw['file'] = self.fout
        print(*args, **kw)


def _file_name(src, dst=None):
    src = os.path.abspath(src)
    if dst and not os.path.isdir(dst):
        dst = os.path.abspath(dst)
    else:
        if dst and os.path.isdir(dst):
            dst_dir = os.path.abspath(dst)
        else:
            dst_dir = os.path.dirname(src)
        name = os.path.basename(os.path.splitext(src)[0])
        dst = os.path.join(dst_dir, name + '.js')
    return dst


def translate_file(src, dst=None):
    dst = _file_name(src, dst)
    src = open(src).readlines()
    js_text, src_map = translates(src, True)
    with open(dst, 'w') as dst:
        dst.write(js_text)


def translate_object(py_obj):
    cwd = os.getcwd()
    src = os.path.abspath(inspect.getsourcefile(py_obj))
    prefix = os.path.commonpath((cwd, src))
    if len(prefix) > 1:
        src = src[len(prefix) + 1:]
    lines = inspect.getsourcelines(py_obj)
    return translates(lines)


def translates(src, dedent=True):
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


def transform(src, dst=None):
    translate_file(src, dst)


def transform_string(input,
                     transpile=False,
                     enable_es6=False,
                     enable_stage3=False,
                     **kw):
    inline_map = kw.get('inline_map', False)
    source_name = kw.get('source_name', None)
    if inline_map and source_name is None:
        raise ValueError("A source name is needed, please specify it using "
                         "the '--source-name option.")
    res = translates(input)
    return res


def main(args=None, fout=None, ferr=None):
    result = 0
    rep = Reporter(fout, ferr)
    args = parser.parse_args(args)
    if not (args.files):
        rep.print_err("Error: You have to supply either a string with -s or a "
                      "filename")
        result = 3
    if args.eval and not args.string:
        rep.print_err("Error: You have to supply a string with -s when using "
                      "evaluation")
    elif args.output and len(args.files) > 1:
        rep.print_err("Error: only one source file is allowed when "
                      "--output is specified.")
        result = 2
    else:
        try:
            for fname in args.files:
                src = Path(fname)
                if not src.exists():
                    rep.print_err("Skipping non existent file '%s'" % src)
                    continue
                if args.output:
                    dst = Path(args.output)
                else:
                    dst = None
                if src.is_dir():
                    if dst and src != dst:
                        if dst.exists() and not dst.is_dir():
                            rep.print_err(
                                "Source is a directory but output exists "
                                "and it isn't")
                            result = 1
                            break
                        if not dst.exists():
                            dst.mkdir()
                    src_root = src
                    dst_root = dst
                    src_dirs = deque([src_root])
                    while len(src_dirs) > 0:
                        sdir = src_dirs.popleft()
                        if dst_root:
                            ddir = dst_root / sdir.relative_to(src_root)
                            if not ddir.exists():
                                ddir.mkdir()
                        else:
                            ddir = None
                        for spath in sdir.iterdir():
                            if spath.name in ('__pycache__', '__init__.py'):
                                continue
                            elif spath.is_dir():
                                src_dirs.append(spath)
                                continue
                            elif spath.suffix == '.py':
                                try:
                                    transform(str(spath),
                                              str(ddir) if ddir else None)
                                    rep.print("Compiled file %s" % spath)
                                except Exception as e:
                                    e.src_fname = spath
                                    raise
                else:
                    try:
                        transform(fname, args.output)
                        rep.print("Compiled file %s" % fname)
                    except Exception as e:
                        e.src_fname = fname
                        raise
        except Exception as e:
            src_fname = getattr(e, 'src_fname', None)
            error = "%s: %s" % (e.__class__.__name__, e)
            if src_fname:
                rep.print_err("An error occurred while compiling source "
                              "file '%s'" % src_fname)
            else:
                rep.print_err("An error occurred during processing.")
                rep.print_err(error)
            result = 1
    sys.exit(result)


if __name__ == '__main__':
    main()
