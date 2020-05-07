"""Dispatcher used when transforming a mypy AST to the IR form.

mypyc.irbuild.builder and mypyc.irbuild.main are closely related.
"""

from typing_extensions import NoReturn

from frompy.nodes import (
    FrompyFile,
    FuncDef,
    ReturnStmt,
    AssignmentStmt,
    OpExpr,
    IntExpr,
    NameExpr,
    Var,
    IfStmt,
    UnaryExpr,
    ComparisonExpr,
    WhileStmt,
    CallExpr,
    IndexExpr,
    Block,
    ListExpr,
    ExpressionStmt,
    MemberExpr,
    ForStmt,
    BreakStmt,
    ContinueStmt,
    ConditionalExpr,
    OperatorAssignmentStmt,
    TupleExpr,
    ClassDef,
    Import,
    ImportFrom,
    ImportAll,
    DictExpr,
    StrExpr,
    CastExpr,
    TempNode,
    PassStmt,
    PromoteExpr,
    AssignmentExpr,
    AwaitExpr,
    BackquoteExpr,
    AssertStmt,
    BytesExpr,
    ComplexExpr,
    Decorator,
    DelStmt,
    DictionaryComprehension,
    EllipsisExpr,
    EnumCallExpr,
    ExecStmt,
    FloatExpr,
    GeneratorExpr,
    GlobalDecl,
    LambdaExpr,
    ListComprehension,
    SetComprehension,
    NamedTupleExpr,
    NewTypeExpr,
    NonlocalDecl,
    OverloadedFuncDef,
    PrintStmt,
    RaiseStmt,
    RevealExpr,
    SetExpr,
    SliceExpr,
    StarExpr,
    SuperExpr,
    TryStmt,
    TypeAliasExpr,
    TypeApplication,
    TypeVarExpr,
    TypedDictExpr,
    UnicodeExpr,
    WithStmt,
    YieldFromExpr,
    YieldExpr,
)

from py2jl.ir.ops import Value
from py2jl.irbuild.builder import IRVisitor, IRBuilder, UnsupportedException
from py2jl.irbuild.classdef import transform_class_def
from py2jl.irbuild.function import (
    transform_func_def,
    transform_overloaded_func_def,
    transform_decorator,
    transform_lambda_expr,
    transform_yield_expr,
    transform_yield_from_expr,
    transform_await_expr,
)
from py2jl.irbuild.statement import (
    transform_block,
    transform_expression_stmt,
    transform_return_stmt,
    transform_assignment_stmt,
    transform_operator_assignment_stmt,
    transform_import,
    transform_import_from,
    transform_import_all,
    transform_if_stmt,
    transform_while_stmt,
    transform_for_stmt,
    transform_break_stmt,
    transform_continue_stmt,
    transform_raise_stmt,
    transform_try_stmt,
    transform_with_stmt,
    transform_assert_stmt,
    transform_del_stmt,
)
from py2jl.irbuild.expression import (
    transform_name_expr,
    transform_member_expr,
    transform_super_expr,
    transform_call_expr,
    transform_unary_expr,
    transform_op_expr,
    transform_index_expr,
    transform_conditional_expr,
    transform_int_expr,
    transform_float_expr,
    transform_complex_expr,
    transform_comparison_expr,
    transform_str_expr,
    transform_bytes_expr,
    transform_ellipsis,
    transform_list_expr,
    transform_tuple_expr,
    transform_dict_expr,
    transform_set_expr,
    transform_list_comprehension,
    transform_set_comprehension,
    transform_dictionary_comprehension,
    transform_slice_expr,
    transform_generator_expr,
)


class IRBuilderVisitor(IRVisitor):
    """Mypy node visitor that dispatches to node transform implementations.

    This class should have no non-trivial logic.

    This visitor is separated from the rest of code to improve modularity and
    to avoid import cycles.

    This is based on the visitor pattern
    (https://en.wikipedia.org/wiki/Visitor_pattern).
    """

    # This gets passed to all the implementations and contains all the
    # state and many helpers. The attribute is initialized outside
    # this class since this class and IRBuilder form a reference loop.
    builder = None  # type: IRBuilder

    def visit_mypy_file(self, mypyfile: FrompyFile) -> None:
        assert False, "use transform_mypy_file instead"

    def visit_class_def(self, cdef: ClassDef) -> None:
        transform_class_def(self.builder, cdef)

    def visit_import(self, node: Import) -> None:
        transform_import(self.builder, node)

    def visit_import_from(self, node: ImportFrom) -> None:
        transform_import_from(self.builder, node)

    def visit_import_all(self, node: ImportAll) -> None:
        transform_import_all(self.builder, node)

    def visit_func_def(self, fdef: FuncDef) -> None:
        transform_func_def(self.builder, fdef)

    def visit_overloaded_func_def(self, o: OverloadedFuncDef) -> None:
        transform_overloaded_func_def(self.builder, o)

    def visit_decorator(self, dec: Decorator) -> None:
        transform_decorator(self.builder, dec)

    def visit_block(self, block: Block) -> None:
        transform_block(self.builder, block)

    # Statements

    def visit_expression_stmt(self, stmt: ExpressionStmt) -> None:
        transform_expression_stmt(self.builder, stmt)

    def visit_return_stmt(self, stmt: ReturnStmt) -> None:
        transform_return_stmt(self.builder, stmt)

    def visit_assignment_stmt(self, stmt: AssignmentStmt) -> None:
        transform_assignment_stmt(self.builder, stmt)

    def visit_operator_assignment_stmt(self, stmt: OperatorAssignmentStmt) -> None:
        transform_operator_assignment_stmt(self.builder, stmt)

    def visit_if_stmt(self, stmt: IfStmt) -> None:
        transform_if_stmt(self.builder, stmt)

    def visit_while_stmt(self, stmt: WhileStmt) -> None:
        transform_while_stmt(self.builder, stmt)

    def visit_for_stmt(self, stmt: ForStmt) -> None:
        transform_for_stmt(self.builder, stmt)

    def visit_break_stmt(self, stmt: BreakStmt) -> None:
        transform_break_stmt(self.builder, stmt)

    def visit_continue_stmt(self, stmt: ContinueStmt) -> None:
        transform_continue_stmt(self.builder, stmt)

    def visit_raise_stmt(self, stmt: RaiseStmt) -> None:
        transform_raise_stmt(self.builder, stmt)

    def visit_try_stmt(self, stmt: TryStmt) -> None:
        transform_try_stmt(self.builder, stmt)

    def visit_with_stmt(self, stmt: WithStmt) -> None:
        transform_with_stmt(self.builder, stmt)

    def visit_pass_stmt(self, stmt: PassStmt) -> None:
        pass

    def visit_assert_stmt(self, stmt: AssertStmt) -> None:
        transform_assert_stmt(self.builder, stmt)

    def visit_del_stmt(self, stmt: DelStmt) -> None:
        transform_del_stmt(self.builder, stmt)

    def visit_global_decl(self, stmt: GlobalDecl) -> None:
        # Pure declaration -- no runtime effect
        pass

    def visit_nonlocal_decl(self, stmt: NonlocalDecl) -> None:
        # Pure declaration -- no runtime effect
        pass

    # Expressions

    def visit_name_expr(self, expr: NameExpr) -> Value:
        return transform_name_expr(self.builder, expr)

    def visit_member_expr(self, expr: MemberExpr) -> Value:
        return transform_member_expr(self.builder, expr)

    def visit_super_expr(self, expr: SuperExpr) -> Value:
        return transform_super_expr(self.builder, expr)

    def visit_call_expr(self, expr: CallExpr) -> Value:
        return transform_call_expr(self.builder, expr)

    def visit_unary_expr(self, expr: UnaryExpr) -> Value:
        return transform_unary_expr(self.builder, expr)

    def visit_op_expr(self, expr: OpExpr) -> Value:
        return transform_op_expr(self.builder, expr)

    def visit_index_expr(self, expr: IndexExpr) -> Value:
        return transform_index_expr(self.builder, expr)

    def visit_conditional_expr(self, expr: ConditionalExpr) -> Value:
        return transform_conditional_expr(self.builder, expr)

    def visit_comparison_expr(self, expr: ComparisonExpr) -> Value:
        return transform_comparison_expr(self.builder, expr)

    def visit_int_expr(self, expr: IntExpr) -> Value:
        return transform_int_expr(self.builder, expr)

    def visit_float_expr(self, expr: FloatExpr) -> Value:
        return transform_float_expr(self.builder, expr)

    def visit_complex_expr(self, expr: ComplexExpr) -> Value:
        return transform_complex_expr(self.builder, expr)

    def visit_str_expr(self, expr: StrExpr) -> Value:
        return transform_str_expr(self.builder, expr)

    def visit_bytes_expr(self, expr: BytesExpr) -> Value:
        return transform_bytes_expr(self.builder, expr)

    def visit_ellipsis(self, expr: EllipsisExpr) -> Value:
        return transform_ellipsis(self.builder, expr)

    def visit_list_expr(self, expr: ListExpr) -> Value:
        return transform_list_expr(self.builder, expr)

    def visit_tuple_expr(self, expr: TupleExpr) -> Value:
        return transform_tuple_expr(self.builder, expr)

    def visit_dict_expr(self, expr: DictExpr) -> Value:
        return transform_dict_expr(self.builder, expr)

    def visit_set_expr(self, expr: SetExpr) -> Value:
        return transform_set_expr(self.builder, expr)

    def visit_list_comprehension(self, expr: ListComprehension) -> Value:
        return transform_list_comprehension(self.builder, expr)

    def visit_set_comprehension(self, expr: SetComprehension) -> Value:
        return transform_set_comprehension(self.builder, expr)

    def visit_dictionary_comprehension(self, expr: DictionaryComprehension) -> Value:
        return transform_dictionary_comprehension(self.builder, expr)

    def visit_slice_expr(self, expr: SliceExpr) -> Value:
        return transform_slice_expr(self.builder, expr)

    def visit_generator_expr(self, expr: GeneratorExpr) -> Value:
        return transform_generator_expr(self.builder, expr)

    def visit_lambda_expr(self, expr: LambdaExpr) -> Value:
        return transform_lambda_expr(self.builder, expr)

    def visit_yield_expr(self, expr: YieldExpr) -> Value:
        return transform_yield_expr(self.builder, expr)

    def visit_yield_from_expr(self, o: YieldFromExpr) -> Value:
        return transform_yield_from_expr(self.builder, o)

    def visit_await_expr(self, o: AwaitExpr) -> Value:
        return transform_await_expr(self.builder, o)

    # Unimplemented constructs

    def visit_assignment_expr(self, o: AssignmentExpr) -> Value:
        self.bail("I Am The Walrus (unimplemented)", o.line)

    # Unimplemented constructs that shouldn't come up because they are py2 only

    def visit_backquote_expr(self, o: BackquoteExpr) -> Value:
        self.bail("Python 2 features are unsupported", o.line)

    def visit_exec_stmt(self, o: ExecStmt) -> None:
        self.bail("Python 2 features are unsupported", o.line)

    def visit_print_stmt(self, o: PrintStmt) -> None:
        self.bail("Python 2 features are unsupported", o.line)

    def visit_unicode_expr(self, o: UnicodeExpr) -> Value:
        self.bail("Python 2 features are unsupported", o.line)

    # Constructs that shouldn't ever show up

    def visit_enum_call_expr(self, o: EnumCallExpr) -> Value:
        assert False, "can't compile analysis-only expressions"

    def visit__promote_expr(self, o: PromoteExpr) -> Value:
        assert False, "can't compile analysis-only expressions"

    def visit_namedtuple_expr(self, o: NamedTupleExpr) -> Value:
        assert False, "can't compile analysis-only expressions"

    def visit_newtype_expr(self, o: NewTypeExpr) -> Value:
        assert False, "can't compile analysis-only expressions"

    def visit_temp_node(self, o: TempNode) -> Value:
        assert False, "can't compile analysis-only expressions"

    def visit_type_alias_expr(self, o: TypeAliasExpr) -> Value:
        assert False, "can't compile analysis-only expressions"

    def visit_type_application(self, o: TypeApplication) -> Value:
        assert False, "can't compile analysis-only expressions"

    def visit_type_var_expr(self, o: TypeVarExpr) -> Value:
        assert False, "can't compile analysis-only expressions"

    def visit_typeddict_expr(self, o: TypedDictExpr) -> Value:
        assert False, "can't compile analysis-only expressions"

    def visit_reveal_expr(self, o: RevealExpr) -> Value:
        assert False, "can't compile analysis-only expressions"

    def visit_var(self, o: Var) -> None:
        assert False, "can't compile Var; should have been handled already?"

    def visit_cast_expr(self, o: CastExpr) -> Value:
        assert False, "CastExpr should have been handled in CallExpr"

    def visit_star_expr(self, o: StarExpr) -> Value:
        assert False, "should have been handled in Tuple/List/Set/DictExpr or CallExpr"

    # Helpers

    def bail(self, msg: str, line: int) -> NoReturn:
        """Reports an error and aborts compilation up until the last accept() call

        (accept() catches the UnsupportedException and keeps on
        processing. This allows errors to be non-blocking without always
        needing to write handling for them.
        """
        self.builder.error(msg, line)
        raise UnsupportedException()
