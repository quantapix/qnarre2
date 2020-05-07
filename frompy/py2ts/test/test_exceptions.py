"""Test runner for exception handling transform test cases.

The transform inserts exception handling branch operations to IR.
"""

import os.path

from frompy.test.config import test_temp_dir
from frompy.test.data import DataDrivenTestCase
from frompy.errors import CompileError

from py2ts.common import TOP_LEVEL_NAME
from py2ts.ir.func_ir import format_func
from py2ts.transform.uninit import insert_uninit_checks
from py2ts.transform.exceptions import insert_exception_handling
from py2ts.transform.refcount import insert_ref_count_opcodes
from py2ts.test.testutil import (
    ICODE_GEN_BUILTINS,
    use_custom_builtins,
    Py2tsDataSuite,
    build_ir_for_single_file,
    assert_test_output,
    remove_comment_lines,
)

files = ["exceptions.test"]


class TestExceptionTransform(Py2tsDataSuite):
    files = files
    base_path = test_temp_dir

    def run_case(self, testcase: DataDrivenTestCase) -> None:
        """Perform a runtime checking transformation test case."""
        with use_custom_builtins(
            os.path.join(self.data_prefix, ICODE_GEN_BUILTINS), testcase
        ):
            expected_output = remove_comment_lines(testcase.output)

            try:
                ir = build_ir_for_single_file(testcase.input)
            except CompileError as e:
                actual = e.messages
            else:
                actual = []
                for fn in ir:
                    if fn.name == TOP_LEVEL_NAME and not testcase.name.endswith(
                        "_toplevel"
                    ):
                        continue
                    insert_uninit_checks(fn)
                    insert_exception_handling(fn)
                    insert_ref_count_opcodes(fn)
                    actual.extend(format_func(fn))

            assert_test_output(
                testcase, actual, "Invalid source code output", expected_output
            )
