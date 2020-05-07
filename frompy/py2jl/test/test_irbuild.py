"""Test cases for IR generation."""

import os.path

from frompy.test.config import test_temp_dir
from frompy.test.data import DataDrivenTestCase
from frompy.errors import CompileError

from py2jl.common import TOP_LEVEL_NAME
from py2jl.ir.func_ir import format_func
from py2jl.test.testutil import (
    ICODE_GEN_BUILTINS,
    use_custom_builtins,
    Py2jlDataSuite,
    build_ir_for_single_file,
    assert_test_output,
    remove_comment_lines,
)
from py2jl.options import CompilerOptions

files = [
    "irbuild-basic.test",
    "irbuild-lists.test",
    "irbuild-dict.test",
    "irbuild-statements.test",
    "irbuild-nested.test",
    "irbuild-classes.test",
    "irbuild-optional.test",
    "irbuild-tuple.test",
    "irbuild-any.test",
    "irbuild-generics.test",
    "irbuild-try.test",
    "irbuild-set.test",
    "irbuild-strip-asserts.test",
]


class TestGenOps(Py2jlDataSuite):
    files = files
    base_path = test_temp_dir
    optional_out = True

    def run_case(self, testcase: DataDrivenTestCase) -> None:
        # Kind of hacky. Not sure if we need more structure here.
        options = CompilerOptions(strip_asserts="StripAssert" in testcase.name)
        """Perform a runtime checking transformation test case."""
        with use_custom_builtins(
            os.path.join(self.data_prefix, ICODE_GEN_BUILTINS), testcase
        ):
            expected_output = remove_comment_lines(testcase.output)

            try:
                ir = build_ir_for_single_file(testcase.input, options)
            except CompileError as e:
                actual = e.messages
            else:
                actual = []
                for fn in ir:
                    if fn.name == TOP_LEVEL_NAME and not testcase.name.endswith(
                        "_toplevel"
                    ):
                        continue
                    actual.extend(format_func(fn))

            assert_test_output(
                testcase, actual, "Invalid source code output", expected_output
            )
