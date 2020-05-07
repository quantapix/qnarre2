"""Merge a new version of a module AST and symbol table to older versions of those.

When the source code of a module has a change in fine-grained incremental mode,
we build a new AST from the updated source. However, other parts of the program
may have direct references to parts of the old AST (namely, those nodes exposed
in the module symbol table). The merge operation changes the identities of new
AST nodes that have a correspondence in the old AST to the old ones so that
existing cross-references in other modules will continue to point to the correct
nodes. Also internal cross-references within the new AST are replaced. AST nodes
that aren't externally visible will get new, distinct object identities. This
applies to most expression and statement nodes, for example.

We perform this merge operation so that we don't have to update all
external references (which would be slow and fragile) or always perform
translation when looking up references (which would be hard to retrofit).

The AST merge operation is performed after semantic analysis. Semantic
analysis has to deal with potentially multiple aliases to certain AST
nodes (in particular, FrompyFile nodes). Type checking assumes that we
don't have multiple variants of a single AST node visible to the type
checker.

Discussion of some notable special cases:

* If a node is replaced with a different kind of node (say, a function is
  replaced with a class), we don't perform the merge. Fine-grained dependencies
  will be used to rebind all references to the node.

* If a function is replaced with another function with an identical signature,
  call sites continue to point to the same object (by identity) and don't need
  to be reprocessed. Similarly, if a class is replaced with a class that is
  sufficiently similar (MRO preserved, etc.), class references don't need any
  processing. A typical incremental update to a file only changes a few
  externally visible things in a module, and this means that often only few
  external references need any processing, even if the modified module is large.

* A no-op update of a module should not require any processing outside the
  module, since all relevant object identities are preserved.

* The AST diff operation (mypy.server.astdiff) and the top-level fine-grained
  incremental logic (mypy.server.update) handle the cases where the new AST has
  differences from the old one that may need to be propagated to elsewhere in the
  program.

See the main entry point merge_asts for more details.
"""

from typing import Dict, List, cast, TypeVar, Optional

from frompy.nodes import (
    FrompyFile,
    SymbolTable,
    Block,
    AssignmentStmt,
    NameExpr,
    MemberExpr,
    RefExpr,
    TypeInfo,
    FuncDef,
    ClassDef,
    NamedTupleExpr,
    SymbolNode,
    Var,
    Statement,
    SuperExpr,
    NewTypeExpr,
    OverloadedFuncDef,
    LambdaExpr,
    TypedDictExpr,
    EnumCallExpr,
    FuncBase,
    TypeAliasExpr,
    CallExpr,
    CastExpr,
    TypeAlias,
    MDEF,
)
from frompy.traverser import TraverserVisitor
from frompy.types import (
    Type,
    SyntheticTypeVisitor,
    Instance,
    AnyType,
    NoneType,
    CallableType,
    ErasedType,
    DeletedType,
    TupleType,
    TypeType,
    TypeVarType,
    TypedDictType,
    UnboundType,
    UninhabitedType,
    UnionType,
    Overloaded,
    TypeVarDef,
    TypeList,
    CallableArgument,
    EllipsisType,
    StarType,
    LiteralType,
    RawExpressionType,
    PartialType,
    PlaceholderType,
    TypeAliasType,
)
from frompy.util import get_prefix, replace_object_state
from frompy.typestate import TypeState


def merge_asts(
    old: FrompyFile, old_symbols: SymbolTable, new: FrompyFile, new_symbols: SymbolTable
) -> None:
    """Merge a new version of a module AST to a previous version.

    The main idea is to preserve the identities of externally visible
    nodes in the old AST (that have a corresponding node in the new AST).
    All old node state (outside identity) will come from the new AST.

    When this returns, 'old' will refer to the merged AST, but 'new_symbols'
    will be the new symbol table. 'new' and 'old_symbols' will no longer be
    valid.
    """
    assert new.fullname == old.fullname
    # Find the mapping from new to old node identities for all nodes
    # whose identities should be preserved.
    replacement_map = replacement_map_from_symbol_table(
        old_symbols, new_symbols, prefix=old.fullname
    )
    # Also replace references to the new FrompyFile node.
    replacement_map[new] = old
    # Perform replacements to everywhere within the new AST (not including symbol
    # tables).
    node = replace_nodes_in_ast(new, replacement_map)
    assert node is old
    # Also replace AST node references in the *new* symbol table (we'll
    # continue to use the new symbol table since it has all the new definitions
    # that have no correspondence in the old AST).
    replace_nodes_in_symbol_table(new_symbols, replacement_map)


def replacement_map_from_symbol_table(
    old: SymbolTable, new: SymbolTable, prefix: str
) -> Dict[SymbolNode, SymbolNode]:
    """Create a new-to-old object identity map by comparing two symbol table revisions.

    Both symbol tables must refer to revisions of the same module id. The symbol tables
    are compared recursively (recursing into nested class symbol tables), but only within
    the given module prefix. Don't recurse into other modules accessible through the symbol
    table.
    """
    replacements = {}  # type: Dict[SymbolNode, SymbolNode]
    for name, node in old.items():
        if name in new and (
            node.kind == MDEF or node.node and get_prefix(node.node.fullname) == prefix
        ):
            new_node = new[name]
            if (
                type(new_node.node) == type(node.node)  # noqa
                and new_node.node
                and node.node
                and new_node.node.fullname == node.node.fullname
                and new_node.kind == node.kind
            ):
                replacements[new_node.node] = node.node
                if isinstance(node.node, TypeInfo) and isinstance(
                    new_node.node, TypeInfo
                ):
                    type_repl = replacement_map_from_symbol_table(
                        node.node.names, new_node.node.names, prefix
                    )
                    replacements.update(type_repl)
    return replacements


def replace_nodes_in_ast(
    node: SymbolNode, replacements: Dict[SymbolNode, SymbolNode]
) -> SymbolNode:
    """Replace all references to replacement map keys within an AST node, recursively.

    Also replace the *identity* of any nodes that have replacements. Return the
    *replaced* version of the argument node (which may have a different identity, if
    it's included in the replacement map).
    """
    visitor = NodeReplaceVisitor(replacements)
    node.accept(visitor)
    return replacements.get(node, node)


SN = TypeVar("SN", bound=SymbolNode)


class NodeReplaceVisitor(TraverserVisitor):
    """Transform some nodes to new identities in an AST.

    Only nodes that live in the symbol table may be
    replaced, which simplifies the implementation some. Also
    replace all references to the old identities.
    """

    def __init__(self, replacements: Dict[SymbolNode, SymbolNode]) -> None:
        self.replacements = replacements

    def visit_mypy_file(self, node: FrompyFile) -> None:
        node = self.fixup(node)
        node.defs = self.replace_statements(node.defs)
        super().visit_mypy_file(node)

    def visit_block(self, node: Block) -> None:
        super().visit_block(node)
        node.body = self.replace_statements(node.body)

    def visit_func_def(self, node: FuncDef) -> None:
        node = self.fixup(node)
        self.process_base_func(node)
        super().visit_func_def(node)

    def visit_overloaded_func_def(self, node: OverloadedFuncDef) -> None:
        self.process_base_func(node)
        super().visit_overloaded_func_def(node)

    def visit_class_def(self, node: ClassDef) -> None:
        # TODO additional things?
        node.info = self.fixup_and_reset_typeinfo(node.info)
        node.defs.body = self.replace_statements(node.defs.body)
        info = node.info
        for tv in node.type_vars:
            self.process_type_var_def(tv)
        if info:
            if info.is_named_tuple:
                self.process_synthetic_type_info(info)
            else:
                self.process_type_info(info)
        super().visit_class_def(node)

    def process_base_func(self, node: FuncBase) -> None:
        self.fixup_type(node.type)
        node.info = self.fixup(node.info)
        if node.unanalyzed_type:
            # Unanalyzed types can have AST node references
            self.fixup_type(node.unanalyzed_type)

    def process_type_var_def(self, tv: TypeVarDef) -> None:
        for value in tv.values:
            self.fixup_type(value)
        self.fixup_type(tv.upper_bound)

    def visit_assignment_stmt(self, node: AssignmentStmt) -> None:
        self.fixup_type(node.type)
        super().visit_assignment_stmt(node)

    # Expressions

    def visit_name_expr(self, node: NameExpr) -> None:
        self.visit_ref_expr(node)

    def visit_member_expr(self, node: MemberExpr) -> None:
        if node.def_var:
            node.def_var = self.fixup(node.def_var)
        self.visit_ref_expr(node)
        super().visit_member_expr(node)

    def visit_ref_expr(self, node: RefExpr) -> None:
        if node.node is not None:
            node.node = self.fixup(node.node)
            if isinstance(node.node, Var):
                # The Var node may be an orphan and won't otherwise be processed.
                node.node.accept(self)

    def visit_namedtuple_expr(self, node: NamedTupleExpr) -> None:
        super().visit_namedtuple_expr(node)
        node.info = self.fixup_and_reset_typeinfo(node.info)
        self.process_synthetic_type_info(node.info)

    def visit_cast_expr(self, node: CastExpr) -> None:
        super().visit_cast_expr(node)
        self.fixup_type(node.type)

    def visit_super_expr(self, node: SuperExpr) -> None:
        super().visit_super_expr(node)
        if node.info is not None:
            node.info = self.fixup(node.info)

    def visit_call_expr(self, node: CallExpr) -> None:
        super().visit_call_expr(node)
        if isinstance(node.analyzed, SymbolNode):
            node.analyzed = self.fixup(node.analyzed)

    def visit_newtype_expr(self, node: NewTypeExpr) -> None:
        if node.info:
            node.info = self.fixup_and_reset_typeinfo(node.info)
            self.process_synthetic_type_info(node.info)
        self.fixup_type(node.old_type)
        super().visit_newtype_expr(node)

    def visit_lambda_expr(self, node: LambdaExpr) -> None:
        node.info = self.fixup(node.info)
        super().visit_lambda_expr(node)

    def visit_typeddict_expr(self, node: TypedDictExpr) -> None:
        super().visit_typeddict_expr(node)
        node.info = self.fixup_and_reset_typeinfo(node.info)
        self.process_synthetic_type_info(node.info)

    def visit_enum_call_expr(self, node: EnumCallExpr) -> None:
        node.info = self.fixup_and_reset_typeinfo(node.info)
        self.process_synthetic_type_info(node.info)
        super().visit_enum_call_expr(node)

    def visit_type_alias_expr(self, node: TypeAliasExpr) -> None:
        self.fixup_type(node.type)
        super().visit_type_alias_expr(node)

    # Others

    def visit_var(self, node: Var) -> None:
        node.info = self.fixup(node.info)
        self.fixup_type(node.type)
        super().visit_var(node)

    def visit_type_alias(self, node: TypeAlias) -> None:
        self.fixup_type(node.target)
        super().visit_type_alias(node)

    # Helpers

    def fixup(self, node: SN) -> SN:
        if node in self.replacements:
            new = self.replacements[node]
            replace_object_state(new, node)
            return cast(SN, new)
        return node

    def fixup_and_reset_typeinfo(self, node: TypeInfo) -> TypeInfo:
        """Fix-up type info and reset subtype caches.

        This needs to be called at least once per each merged TypeInfo, as otherwise we
        may leak stale caches.
        """
        if node in self.replacements:
            # The subclass relationships may change, so reset all caches relevant to the
            # old MRO.
            new = cast(TypeInfo, self.replacements[node])
            TypeState.reset_all_subtype_caches_for(new)
        return self.fixup(node)

    def fixup_type(self, typ: Optional[Type]) -> None:
        if typ is not None:
            typ.accept(TypeReplaceVisitor(self.replacements))

    def process_type_info(self, info: Optional[TypeInfo]) -> None:
        if info is None:
            return
        self.fixup_type(info.declared_metaclass)
        self.fixup_type(info.metaclass_type)
        self.fixup_type(info._promote)
        self.fixup_type(info.tuple_type)
        self.fixup_type(info.typeddict_type)
        info.defn.info = self.fixup(info)
        replace_nodes_in_symbol_table(info.names, self.replacements)
        for i, item in enumerate(info.mro):
            info.mro[i] = self.fixup(info.mro[i])
        for i, base in enumerate(info.bases):
            self.fixup_type(info.bases[i])

    def process_synthetic_type_info(self, info: TypeInfo) -> None:
        # Synthetic types (types not created using a class statement) don't
        # have bodies in the AST so we need to iterate over their symbol
        # tables separately, unlike normal classes.
        self.process_type_info(info)
        for name, node in info.names.items():
            if node.node:
                node.node.accept(self)

    def replace_statements(self, nodes: List[Statement]) -> List[Statement]:
        result = []
        for node in nodes:
            if isinstance(node, SymbolNode):
                node = self.fixup(node)
            result.append(node)
        return result


class TypeReplaceVisitor(SyntheticTypeVisitor[None]):
    """Similar to NodeReplaceVisitor, but for type objects.

    Note: this visitor may sometimes visit unanalyzed types
    such as 'UnboundType' and 'RawExpressionType' For example, see
    NodeReplaceVisitor.process_base_func.
    """

    def __init__(self, replacements: Dict[SymbolNode, SymbolNode]) -> None:
        self.replacements = replacements

    def visit_instance(self, typ: Instance) -> None:
        typ.type = self.fixup(typ.type)
        for arg in typ.args:
            arg.accept(self)
        if typ.last_known_value:
            typ.last_known_value.accept(self)

    def visit_type_alias_type(self, typ: TypeAliasType) -> None:
        assert typ.alias is not None
        typ.alias = self.fixup(typ.alias)
        for arg in typ.args:
            arg.accept(self)

    def visit_any(self, typ: AnyType) -> None:
        pass

    def visit_none_type(self, typ: NoneType) -> None:
        pass

    def visit_callable_type(self, typ: CallableType) -> None:
        for arg in typ.arg_types:
            arg.accept(self)
        typ.ret_type.accept(self)
        if typ.definition:
            # No need to fixup since this is just a cross-reference.
            typ.definition = self.replacements.get(typ.definition, typ.definition)
        # Fallback can be None for callable types that haven't been semantically analyzed.
        if typ.fallback is not None:
            typ.fallback.accept(self)
        for tv in typ.variables:
            tv.upper_bound.accept(self)
            for value in tv.values:
                value.accept(self)

    def visit_overloaded(self, t: Overloaded) -> None:
        for item in t.items():
            item.accept(self)
        # Fallback can be None for overloaded types that haven't been semantically analyzed.
        if t.fallback is not None:
            t.fallback.accept(self)

    def visit_erased_type(self, t: ErasedType) -> None:
        # This type should exist only temporarily during type inference
        raise RuntimeError

    def visit_deleted_type(self, typ: DeletedType) -> None:
        pass

    def visit_partial_type(self, typ: PartialType) -> None:
        raise RuntimeError

    def visit_tuple_type(self, typ: TupleType) -> None:
        for item in typ.items:
            item.accept(self)
        # Fallback can be None for implicit tuple types that haven't been semantically analyzed.
        if typ.partial_fallback is not None:
            typ.partial_fallback.accept(self)

    def visit_type_type(self, typ: TypeType) -> None:
        typ.item.accept(self)

    def visit_type_var(self, typ: TypeVarType) -> None:
        typ.upper_bound.accept(self)
        for value in typ.values:
            value.accept(self)

    def visit_typeddict_type(self, typ: TypedDictType) -> None:
        for value_type in typ.items.values():
            value_type.accept(self)
        typ.fallback.accept(self)

    def visit_raw_expression_type(self, t: RawExpressionType) -> None:
        pass

    def visit_literal_type(self, typ: LiteralType) -> None:
        typ.fallback.accept(self)

    def visit_unbound_type(self, typ: UnboundType) -> None:
        for arg in typ.args:
            arg.accept(self)

    def visit_type_list(self, typ: TypeList) -> None:
        for item in typ.items:
            item.accept(self)

    def visit_callable_argument(self, typ: CallableArgument) -> None:
        typ.typ.accept(self)

    def visit_ellipsis_type(self, typ: EllipsisType) -> None:
        pass

    def visit_star_type(self, typ: StarType) -> None:
        typ.type.accept(self)

    def visit_uninhabited_type(self, typ: UninhabitedType) -> None:
        pass

    def visit_union_type(self, typ: UnionType) -> None:
        for item in typ.items:
            item.accept(self)

    def visit_placeholder_type(self, t: PlaceholderType) -> None:
        for item in t.args:
            item.accept(self)

    # Helpers

    def fixup(self, node: SN) -> SN:
        if node in self.replacements:
            new = self.replacements[node]
            return cast(SN, new)
        return node


def replace_nodes_in_symbol_table(
    symbols: SymbolTable, replacements: Dict[SymbolNode, SymbolNode]
) -> None:
    for name, node in symbols.items():
        if node.node:
            if node.node in replacements:
                new = replacements[node.node]
                old = node.node
                replace_object_state(new, old)
                node.node = new
            if isinstance(node.node, (Var, TypeAlias)):
                # Handle them here just in case these aren't exposed through the AST.
                node.node.accept(NodeReplaceVisitor(replacements))
