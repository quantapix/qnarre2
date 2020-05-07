"""Test cases for invoking mypyc on the command line.

These are slow -- do not add test cases unless you have a very good reason to do so.
"""

import glob
import os
import os.path
import re
import subprocess
import sys

from frompy.test.data import DataDrivenTestCase
from frompy.test.config import test_temp_dir
from frompy.test.helpers import normalize_error_messages

from py2jl.test.testutil import MypycDataSuite, assert_test_output

files = [
    'commandline.test',
]


base_path = os.path.join(os.path.dirname(__file__), '..', '..')

python3_path = sys.executable


class TestCommandLine(MypycDataSuite):
    files = files
    base_path = test_temp_dir
    optional_out = True

    def run_case(self, testcase: DataDrivenTestCase) -> None:
        # Parse options from test case description (arguments must not have spaces)
        text = '\n'.join(testcase.input)
        m = re.search(r'# *cmd: *(.*)', text)
        assert m is not None, 'Test case missing "# cmd: <files>" section'
        args = m.group(1).split()

        # Write main program to run (not compiled)
        program = '_%s.py' % testcase.name
        program_path = os.path.join(test_temp_dir, program)
        with open(program_path, 'w') as f:
            f.write(text)

        out = b''
        try:
            # Compile program
            cmd = subprocess.run([sys.executable,
                                  os.path.join(base_path, 'scripts', 'mypyc')] + args,
                                 stdout=subprocess.PIPE, stderr=subprocess.STDOUT, cwd='tmp')
            if 'ErrorOutput' in testcase.name or cmd.returncode != 0:
                out += cmd.stdout

            if cmd.returncode == 0:
                # Run main program
                out += subprocess.check_output(
                    [python3_path, program],
                    cwd='tmp')
        finally:
            suffix = 'pyd' if sys.platform == 'win32' else 'so'
            so_paths = glob.glob('tmp/**/*.{}'.format(suffix), recursive=True)
            for path in so_paths:
                os.remove(path)

        # Strip out 'tmp/' from error message paths in the testcase output,
        # due to a mismatch between this test and mypy's test suite.
        expected = [x.replace('tmp/', '') for x in testcase.output]

        # Verify output
        actual = normalize_error_messages(out.decode().splitlines())
        assert_test_output(testcase, actual, 'Invalid output', expected=expected)