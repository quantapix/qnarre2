import ast
import collections as co
import contextlib
import os
import sys
import string
import textwrap
import inspect
import re

from . import ts
from . import xforms


class Transformer:
    def __init__(self, remap=None):
        self.xforms = load_xforms()
        self.remap = remap
        self.reset()

    def reset(self):
        self.snippets = set()
        self._ctx = co.ChainMap()
        self._globs = set()
        self._stack = []
        self._warns = []

    @classmethod
    def create_from(cls, other):
        t = cls.__new__(cls)
        t.xforms = other.xforms
        t.reset()
        for k, v in vars(other).items():
            if k.startswith("enable_"):
                setattr(t, k, v)
        return t

    @property
    def ctx(self):
        return self._ctx

    @contextlib.contextmanager
    def context_for(self, n, **kw):
        if isinstance(n, ast.stmt):
            self._ctx = self._ctx.new_child(kw)
            yield
            self._ctx = self._ctx.parents
        else:
            yield

    def parent_of(self, n):
        return self.pmap.get(n)

    def parents(self, n, stop_at=None):
        p = self.pmap.get(n)
        while p:
            yield p
            if stop_at and isinstance(p, stop_at):
                break
            p = self.pmap.get(p)

    def find_parent(self, n, *classes):
        p = self.parent_of(n)
        if p is not None:
            if isinstance(p, classes):
                return p
            else:
                return self.find_parent(p, *classes)

    def find_child(self, n, cls):
        ns = n
        if not isinstance(n, (tuple, list, set)):
            ns = n
        for n in ns:
            for c in cross_walk(n):
                if isinstance(c, cls):
                    yield c

    def has_child(self, n, cls):
        cs = tuple(self.find_child(n, cls))
        return len(cs) > 0

    def new_name(self):
        i = self.ctx.setdefault("gen_name_i", -1)
        i += 1
        self.ctx["gen_name_i"] = i
        if i > len(string.ascii_letters):
            raise XformError("Failed to gen name")
        return VAR_TEMPLATE % string.ascii_letters[i]

    def xform_tree(self, tree):
        mod = ast.parse(tree)
        body = mod.body
        self._stack.clear()
        self.pmap = build_pmap(mod)
        ns = local_names(body)
        self.ctx["vars"] = ns
        r = ts.Statements(*body)
        self.prep_target(r)
        ns = list(ns - self._globs)
        if len(ns) > 0:
            ns.sort()
            vars = ts.VarStatement(ns, [None] * len(ns))
            self.prep_target(vars)
            r.xargs.insert(0, vars)
        self.pmap = None
        return r

    def prep_target(self, t, py=None):
        t.py = self.remap or py or t.py
        t.xform = self
        if t.xargs is None:
            t.xargs = xs = []
            args = co.deque(t.args)
            self._stack.append(args)
            while args:
                a = args.popleft()
                xs.append(self.xform_node(a))
            self._stack.pop()

    def xform_node(self, n):
        if isinstance(n, list) or isinstance(n, tuple):
            r = [self.xform_node(c) for c in n]
        elif isinstance(n, ast.AST):
            with self.context_for(n):
                for t in self.xforms.get(n.__class__.__name__, []):
                    o = t(self, n)
                    if o is not None:
                        self.prep_target(o, py=n)
                        r = o
                        break
                else:
                    raise XformError(n, "No xform for node")
        elif isinstance(n, ts.Target):
            self.prep_target(n)
            r = n
        else:
            r = n
        return r

    def add_snippet(self, s):
        self.snippets.add(s)

    def xform_snippets(self):
        ss = tuple(sorted(self.snippets, key=lambda e: e.__name__))
        srcs = [source_for(s) for s in ss]
        ns = [s.__name__ for s in ss]
        tree = SNIPPETS_TEMPLATE % {
            "snips": textwrap.indent("\n".join(srcs), " " * 4),
            "assigns": "\n".join([ASSIGN_TEMPLATE % {"name": n} for n in ns]),
        }
        t = self.create_from(self)
        t.snippets = None
        return t.xform_tree(tree)

    def add_globs(self, *gs):
        self._globs |= set(gs)

    def next_args(self):
        return self._stack[-1]

    def warn(self, n, msg):
        self._warns.append((n, msg))

    def unsupported(self, n, cond, msg):
        if cond:
            raise UnsupportedError(n, msg)
        return False

    def subtransform(self, o, remap=None):
        if isinstance(o, str):
            src = textwrap.dedent(o)
        else:
            src = source_for(o)
        t = self.create_from(self)
        t.remap = remap
        t.snippets = None
        return t.xform_tree(src)


class ProcessorError(Exception):
    def __str__(self):
        n = self.args[0]
        if isinstance(n, (ast.expr, ast.stmt)):
            ln = str(n.lineno)
            co = str(n.col_offset)
        else:
            ln = "n. a."
            co = "n. a."
        return f"Node type '{type(n).__name__}': Line: {ln}, column: {co}"


class XformError(ProcessorError):
    def __str__(self):
        e = super().__str__()
        if len(self.args) > 1:
            e += f". {self.args[1]}"
        return e


class UnsupportedError(XformError):
    pass


SNIPPETS_TEMPLATE = """\
def _pt_snippets(container):
%(snippets)s
%(assignments)s
    return container

_pt = {}
_pt_snippets(_pt)

"""

ASSIGN_TEMPLATE = "    container['%(name)s'] = %(name)s"

VAR_TEMPLATE = "_pt_%s"


def source_for(obj):
    s = inspect.getsource(obj)
    s = textwrap.dedent(s)
    return s


def load_xforms():
    d = {}

    def filter(r, it, invert=False):
        if isinstance(r, str):
            r = re.compile(r)
        for x in it:
            m = r.search(x)
            ok = False
            if m:
                ok = True
            if invert:
                if not ok:
                    yield x
            else:
                if ok:
                    yield x

    ns = list(filter(r"[A-Z][a-zA-Z]+", dir(ast)))

    def parent_of(p):
        return os.path.split(os.path.normpath(p))[0]

    fs = filter(r"^[^.]+\.py$", os.listdir(parent_of(xforms.__file__)))
    for f in fs:
        if f != "__init__.py":
            mod_name = "metapensiero.pj.xforms.%s" % f.split(".")[0]
            __import__(mod_name)
            mod = sys.modules[mod_name]
            for n in dir(mod):
                if n in ns:
                    assert n not in d
                    v = getattr(mod, n)
                    if not isinstance(v, list) or isinstance(v, tuple):
                        v = [v]
                    d[n] = v
    return d


def assign_targets(n):
    if isinstance(n, ast.Assign):
        return n.targets
    elif isinstance(n, ast.AnnAssign):
        return [n.target]
    raise TypeError(f"Unsupported assign type: {n.__class__.__name__}")


IGNORED = ("__all__", "__default__")


def node_names(n):
    ns = set()
    if isinstance(n, (ast.Assign, ast.AnnAssign)):
        for t in assign_targets(n):
            if isinstance(t, ast.Name) and t.id not in IGNORED:
                ns.add(t.id)
            elif isinstance(t, ast.Tuple):
                for e in t.elts:
                    if isinstance(e, ast.Name) and e.id not in IGNORED:
                        ns.add(e.id)
    elif isinstance(n, (ast.FunctionDef, ast.ClassDef)):
        ns.add(n.name)
    return ns


def ast_walk(n):
    if isinstance(n, list):
        ns = n.copy()
    elif isinstance(n, tuple):
        ns = list(n)
    else:
        ns = [n]
    while len(ns) > 0:
        r = ns.pop()
        check = yield r
        if check:
            for n in ast.iter_child_nodes(r):
                ns.append(n)


BLOCKS = (ast.FunctionDef, ast.ClassDef, ast.AsyncFunctionDef)


def cross_walk(n):
    it = ast_walk(n)
    cross = None
    try:
        while True:
            r = it.send(cross)
            yield r
            if isinstance(r, BLOCKS):
                cross = False
            else:
                cross = True
    except StopIteration:
        pass


def local_names(body):
    ns = set()
    for s in body:
        for n in cross_walk(s):
            if not isinstance(n, BLOCKS):
                ns |= node_names(n)
    return ns


def top_names(body):
    ns = set()
    for s in body:
        ns |= node_names(s)
    return ns


def build_pmap(top):
    d = {}

    def walk(n):
        for k in n._fields:
            x = getattr(n, k)
            if not (isinstance(x, list) or isinstance(x, tuple)):
                x = [x]
            for y in x:
                if isinstance(y, ast.AST):
                    d[y] = n
                    walk(y)

    walk(top)
    return d
