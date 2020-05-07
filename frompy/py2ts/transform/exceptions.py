"""Transform that inserts error checks after opcodes.

When initially building the IR, the code doesn't perform error checks
for exceptions. This module is used to insert all required error checks
afterwards. Each Op describes how it indicates an error condition (if
at all).

We need to split basic blocks on each error check since branches can
only be placed at the end of a basic block.
"""

from typing import List, Optional

from py2ts.ir.ops import (
    BasicBlock, LoadErrorValue, Return, Branch, RegisterOp, ERR_NEVER, ERR_MAGIC,
    ERR_FALSE, NO_TRACEBACK_LINE_NO,
)
from py2ts.ir.func_ir import FuncIR


def insert_exception_handling(ir: FuncIR) -> None:
    # Generate error block if any ops may raise an exception. If an op
    # fails without its own error handler, we'll branch to this
    # block. The block just returns an error value.
    error_label = None
    for block in ir.blocks:
        can_raise = any(op.can_raise() for op in block.ops)
        if can_raise:
            error_label = add_handler_block(ir)
            break
    if error_label:
        ir.blocks = split_blocks_at_errors(ir.blocks, error_label, ir.traceback_name)


def add_handler_block(ir: FuncIR) -> BasicBlock:
    block = BasicBlock()
    ir.blocks.append(block)
    op = LoadErrorValue(ir.ret_type)
    block.ops.append(op)
    ir.env.add_op(op)
    block.ops.append(Return(op))
    return block


def split_blocks_at_errors(blocks: List[BasicBlock],
                           default_error_handler: BasicBlock,
                           func_name: Optional[str]) -> List[BasicBlock]:
    new_blocks = []  # type: List[BasicBlock]

    # First split blocks on ops that may raise.
    for block in blocks:
        ops = block.ops
        block.ops = []
        cur_block = block
        new_blocks.append(cur_block)

        # If the block has an error handler specified, use it. Otherwise
        # fall back to the default.
        error_label = block.error_handler or default_error_handler
        block.error_handler = None

        for op in ops:
            cur_block.ops.append(op)
            if isinstance(op, RegisterOp) and op.error_kind != ERR_NEVER:
                # Split
                new_block = BasicBlock()
                new_blocks.append(new_block)

                if op.error_kind == ERR_MAGIC:
                    # Op returns an error value on error that depends on result RType.
                    variant = Branch.IS_ERROR
                    negated = False
                elif op.error_kind == ERR_FALSE:
                    # Op returns a C false value on error.
                    variant = Branch.BOOL_EXPR
                    negated = True
                else:
                    assert False, 'unknown error kind %d' % op.error_kind

                # Void ops can't generate errors since error is always
                # indicated by a special value stored in a register.
                assert not op.is_void, "void op generating errors?"

                branch = Branch(op,
                                true_label=error_label,
                                false_label=new_block,
                                op=variant,
                                line=op.line)
                branch.negated = negated
                if op.line != NO_TRACEBACK_LINE_NO and func_name is not None:
                    branch.traceback_entry = (func_name, op.line)
                cur_block.ops.append(branch)
                cur_block = new_block

    return new_blocks
