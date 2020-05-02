import ast
import collections
import contextlib
import os
import sys
import string
import textwrap
import inspect
import re

from .ts import Target

SNIPPETS_TEMPLATE = """\
def _pj_snippets(container):
%(snippets)s
%(assignments)s
    return container

_pj = {}
_pj_snippets(_pj)

"""

ASSIGN_TEMPLATE = "    container['%(name)s'] = %(name)s"

VAR_TEMPLATE = "_pj_%s"


class Transformer:

    enable_snippets = True
    enable_let = False
    """Used in subtransformation to remap a node on a Transformer instance
    to the AST produced by a substransform."""
    remap_to = None

    def __init__(self,
                 py_ast_module,
                 statements_class,
                 snippets=True,
                 remap_to=None):
        self.transformations = load_transformations(py_ast_module)
        self.statements_class = statements_class
        self.enable_snippets = snippets
        self.remap_to = remap_to
        self._init_structs()

    def _init_structs(self):
        self.snippets = set()
        self._globals = set()
        self._args_stack = []
        self._context = collections.ChainMap()
        self._warnings = []

    @property
    def ctx(self):
        return self._context

    def _push_ctx(self, **kw):
        self._context = self._context.new_child(kw)

    def _pop_ctx(self):
        self._context = self._context.parents

    @contextlib.contextmanager
    def context_for(self, py_node, **kw):
        if isinstance(py_node, ast.stmt):
            self._push_ctx(**kw)
            yield
            self._pop_ctx()
        else:
            yield

    @classmethod
    def new_from(cls, instance):
        new = cls.__new__(cls)
        new._init_structs()
        new.transformations = instance.transformations
        new.statements_class = instance.statements_class
        for k, v in vars(instance).items():
            if k.startswith('enable_'):
                setattr(new, k, v)
        return new

    def transform_code(self, ast_tree):
        from .ts import TSVarStatement
        top = ast.parse(ast_tree)
        body = top.body
        self._args_stack.clear()
        self.node_parent_map = build_node_parent_map(top)
        local_vars = body_local_names(body)
        self.ctx['vars'] = local_vars
        result = self.statements_class(*body)
        self._finalize_target_node(result)
        local_vars = list(local_vars - self._globals)
        if len(local_vars) > 0:
            local_vars.sort()
            vars = TSVarStatement(local_vars, [None] * len(local_vars))
            self._finalize_target_node(vars)
            result.transformed_args.insert(0, vars)
        self.node_parent_map = None
        return result

    def parent_of(self, node):
        return self.node_parent_map.get(node)

    def parents(self, node, stop_at=None):
        parent = self.node_parent_map.get(node)
        while parent:
            yield parent
            if stop_at and isinstance(parent, stop_at):
                break
            parent = self.node_parent_map.get(parent)

    def find_parent(self, node, *classes):
        parent = self.parent_of(node)
        if parent is not None:
            if isinstance(parent, classes):
                return parent
            else:
                return self.find_parent(parent, *classes)

    def find_child(self, node, cls):
        if not isinstance(node, (tuple, list, set)):
            node = (node)
        for n in node:
            for c in walk_under_code_boundary(n):
                if isinstance(c, cls):
                    yield c

    def has_child(self, node, cls):
        wanted = tuple(self.find_child(node, cls))
        return len(wanted) > 0

    def new_name(self):
        ix = self.ctx.setdefault('gen_name_ix', -1)
        ix += 1
        self.ctx['gen_name_ix'] = ix
        if ix > len(string.ascii_letters):
            raise TransformationError("Reached maximum index for "
                                      "auto-generated variable names")
        return VAR_TEMPLATE % string.ascii_letters[ix]

    def add_snippet(self, func):
        self.snippets.add(func)

    def _transform_node(self, in_node):
        if isinstance(in_node, list) or isinstance(in_node, tuple):
            res = [self._transform_node(child) for child in in_node]
        elif isinstance(in_node, ast.AST):
            with self.context_for(in_node):
                for transformation in self.transformations.get(
                        in_node.__class__.__name__, []):
                    out_node = transformation(self, in_node)
                    if out_node is not None:
                        self._finalize_target_node(out_node, py_node=in_node)
                        res = out_node
                        break
                else:
                    raise TransformationError(
                        in_node, "No transformation for the node")
        elif isinstance(in_node, Target):
            self._finalize_target_node(in_node)
            res = in_node
        else:
            res = in_node
        return res

    def _finalize_target_node(self, tnode, py_node=None):
        tnode.py_node = self.remap_to or py_node or tnode.py_node
        tnode.transformer = self
        if tnode.transformed_args is None:
            tnode.transformed_args = targs = []
            args = collections.deque(tnode.args)
            self._args_stack.append(args)
            while args:
                arg = args.popleft()
                targs.append(self._transform_node(arg))
            self._args_stack.pop()

    def transform_snippets(self):
        snippets = tuple(sorted(self.snippets, key=lambda e: e.__name__))
        srcs = [obj_source(s) for s in snippets]
        src = textwrap.indent('\n'.join(srcs), ' ' * 4)
        names = [s.__name__ for s in snippets]
        assign_src = '\n'.join([ASSIGN_TEMPLATE % {'name': n} for n in names])
        trans_src = SNIPPETS_TEMPLATE % {
            'snippets': src,
            'assignments': assign_src
        }
        t = self.new_from(self)
        t.snippets = None
        t.enable_snippets = False
        return t.transform_code(trans_src)

    def add_globals(self, *items):
        self._globals |= set(items)

    def next_args(self):
        return self._args_stack[-1]

    def unsupported(self, py_node, cond, desc):
        if cond:
            raise UnsupportedSyntaxError(py_node, desc)
        return False

    def warn(self, py_node, msg):
        self._warnings.append((py_node, msg))

    def subtransform(self, obj, remap_to=None):
        if isinstance(obj, str):
            src = textwrap.dedent(obj)
        else:
            src = obj_source(obj)
        t = self.new_from(self)
        t.remap_to = remap_to
        t.snippets = None
        t.enable_snippets = False
        return t.transform_code(src)


def python_ast_names():
    return rfilter(r'[A-Z][a-zA-Z]+', dir(ast))


def load_transformations(py_ast_module):
    # transformationsDict = {
    #     'NodeName': [...transformation functions...]
    # }
    d = {}
    ast_names = list(python_ast_names())
    filenames = rfilter(r'^[^.]+\.py$',
                        os.listdir(parent_of(py_ast_module.__file__)))
    for filename in filenames:
        if filename != '__init__.py':
            mod_name = 'metapensiero.pj.transformations.%s' % \
                       filename.split('.')[0]
            __import__(mod_name)
            mod = sys.modules[mod_name]
            for name in dir(mod):
                if name in ast_names:
                    assert name not in d
                    value = getattr(mod, name)
                    if not isinstance(value, list) or isinstance(value, tuple):
                        value = [value]
                    d[name] = value
    return d


def build_node_parent_map(top):

    node_parent_map = {}

    def _process_node(node):
        for k in node._fields:
            x = getattr(node, k)
            if not (isinstance(x, list) or isinstance(x, tuple)):
                x = [x]
            for y in x:
                if isinstance(y, ast.AST):
                    node_parent_map[y] = node
                    _process_node(y)

    _process_node(top)

    return node_parent_map


assign_types = (ast.Assign, ast.AnnAssign)


class ProcessorError(Exception):
    def __str__(self):
        py_node = self.args[0]
        if isinstance(py_node, (ast.expr, ast.stmt)):
            lineno = str(py_node.lineno)
            col_offset = str(py_node.col_offset)
        else:
            lineno = 'n. a.'
            col_offset = 'n. a.'
        return "Node type '%s': Line: %s, column: %s" % (
            type(py_node).__name__, lineno, col_offset)


class TransformationError(ProcessorError):
    def __str__(self):
        error = super().__str__()
        if len(self.args) > 1:
            error += ". %s" % self.args[1]
        return error


class UnsupportedSyntaxError(TransformationError):
    pass


def delimited(delimiter, arr, dest=None, at_end=False):
    """Similar to ``str.join()``, but returns an array with an option to
    append the delimiter at the end.
    """
    if dest is None:
        dest = []
    if arr:
        dest.append(arr[0])
    for i in range(1, len(arr)):
        dest.append(delimiter)
        dest.append(arr[i])
    if at_end:
        dest.append(delimiter)
    return dest


def delimited_multi_line(node, text, begin=None, end=None, add_space=False):
    """Used to deal with single and multi line literals."""
    begin = begin or ''
    end = end or ''
    if begin and not end:
        end = begin
    sp = ' ' if add_space else ''
    lines = text.splitlines()
    if len(lines) > 1:
        yield node.line(node.part(begin, lines[0].strip()))
        for l in lines[1:-1]:
            yield node.line(l.strip())
        yield node.line(node.part(lines[-1].strip(), end))
    else:
        yield node.part(begin, sp, text, sp, end)


def parent_of(path):
    return os.path.split(os.path.normpath(path))[0]


def body_top_names(body):
    names = set()
    for x in body:
        names |= node_names(x)
    return names


def controlled_ast_walk(node):
    """Walk AST just like ``ast.walk()``, but expect ``True`` on every
    branch to descend on sub-branches.
    """
    if isinstance(node, list):
        ls = node.copy()
    elif isinstance(node, tuple):
        ls = list(node)
    else:
        ls = [node]
    while len(ls) > 0:
        popped = ls.pop()
        check_children = (yield popped)
        if check_children:
            for n in ast.iter_child_nodes(popped):
                ls.append(n)


CODE_BLOCK_STMTS = (ast.FunctionDef, ast.ClassDef, ast.AsyncFunctionDef)


def walk_under_code_boundary(node):
    it = controlled_ast_walk(node)
    traverse = None
    try:
        while True:
            subn = it.send(traverse)
            yield subn
            if isinstance(subn, CODE_BLOCK_STMTS):
                traverse = False  # continue traversing sub names
            else:
                traverse = True
    except StopIteration:
        pass


def body_local_names(body):
    """Find the names assigned to in the provided `body`. It doesn't descend
    into function or class subelements."""
    names = set()
    for stmt in body:
        for subn in walk_under_code_boundary(stmt):
            if not isinstance(subn, CODE_BLOCK_STMTS):
                names |= node_names(subn)
    return names


def get_assign_targets(py_node):
    if isinstance(py_node, ast.Assign):
        return py_node.targets
    elif isinstance(py_node, ast.AnnAssign):
        return [py_node.target]
    else:
        raise TypeError('Unsupported assign node type: {}'.format(
            py_node.__class__.__name__))


IGNORED_NAMES = ('__all__', '__default__')


def node_names(py_node):
    """Extract 'names' from a Python node. Names are all those interesting
    for the enclosing scope.

    Return a set containing them. The nodes considered are the Assign and the
    ones that defines namespaces, the function and class definitions.

    The assignment can be something like:

    .. code:: python
      a = b # 'a' is the target
      a = b = c # 'a' and 'b' are the targets
      a1, a2 = b = c # ('a1', 'a2') and 'b' are the targets

    """
    names = set()
    if isinstance(py_node, assign_types):
        for el in get_assign_targets(py_node):
            if isinstance(el, ast.Name) and el.id not in \
               IGNORED_NAMES:
                names.add(el.id)
            elif isinstance(el, ast.Tuple):
                for elt in el.elts:
                    if isinstance(elt, ast.Name) and elt.id not in \
                       IGNORED_NAMES:
                        names.add(elt.id)
    elif isinstance(py_node, (ast.FunctionDef, ast.ClassDef)):
        names.add(py_node.name)
    return names


def rfilter(r, it, invert=False):
    """
    >>> list(rfilter(r'^.o+$', ['foo', 'bar']))
    ['foo']

    >>> list(rfilter(r'^.o+$', ['foo', 'bar'], invert=True))
    ['bar']

    """
    # Supports Python 2 and 3
    if isinstance(r, str):
        r = re.compile(r)
    try:
        if isinstance(r, unicode):
            r = re.compile
    except NameError:
        pass

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


class Output:
    def __init__(self, node):
        self.node = node

    def serialize(self):
        yield self


class Line(Output):
    def __init__(self, node, item, indent=False, delim=False):
        super().__init__(node)
        self.indent = int(indent)
        self.delim = delim
        if isinstance(item, (tuple, list)):
            item = Part(node, *item)
        self.item = item

    def __str__(self):
        line = str(self.item)
        if self.delim:
            line += ';'
        if self.indent and line.strip():
            line = (' ' * 4 * self.indent) + line
        line += '\n'
        return line

    def __repr__(self):
        return '<%s indent: %d, "%s">' % (self.__class__.__name__, self.indent,
                                          str(self))


class Part(Output):
    def __init__(self, node, *items):
        super().__init__(node)
        self.items = []
        for i in items:
            if isinstance(i, (str, Part)):
                self.items.append(i)
            elif inspect.isgenerator(i):
                self.items.extend(i)
            else:
                self.items.append(str(i))

    def __str__(self):
        return ''.join(str(i) for i in self.items)

    def __repr__(self):
        return '<%s, "%s">' % (self.__class__.__name__, str(self))


class Block(Output):
    def __init__(self, node):
        super().__init__(None)
        self.lines = list(node.serialize())

    def read(self):
        return ''.join(str(l) for l in self.lines)


def obj_source(obj):
    src = inspect.getsource(obj)
    src = textwrap.dedent(src)
    return src
