"""Tests for mypy incremental error output."""
from typing import List

from frompy import build
from frompy.test.helpers import assert_string_arrays_equal
from frompy.test.data import DataDrivenTestCase, DataSuite
from frompy.modulefinder import BuildSource
from frompy.errors import CompileError
from frompy.options import Options


class ErrorStreamSuite(DataSuite):
    required_out_section = True
    base_path = '.'
    files = ['errorstream.test']

    def run_case(self, testcase: DataDrivenTestCase) -> None:
        test_error_stream(testcase)


def test_error_stream(testcase: DataDrivenTestCase) -> None:
    """Perform a single error streaming test case.

    The argument contains the description of the test case.
    """
    options = Options()
    options.show_traceback = True

    logged_messages = []  # type: List[str]

    def flush_errors(msgs: List[str], serious: bool) -> None:
        if msgs:
            logged_messages.append('==== Errors flushed ====')
            logged_messages.extend(msgs)

    sources = [BuildSource('main', '__main__', '\n'.join(testcase.input))]
    try:
        build.build(sources=sources,
                    options=options,
                    flush_errors=flush_errors)
    except CompileError as e:
        assert e.messages == []

    assert_string_arrays_equal(testcase.output, logged_messages,
                               'Invalid output ({}, line {})'.format(
                                   testcase.file, testcase.line))
