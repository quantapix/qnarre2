"""Test cases for building an C extension and running it."""

import ast
import glob
import os.path
import platform
import re
import subprocess
import contextlib
import shutil
import sys
from typing import Any, Iterator, List, cast

from frompy import build
from frompy.test.data import DataDrivenTestCase, UpdateFile
from frompy.test.config import test_temp_dir
from frompy.errors import CompileError
from frompy.options import Options
from frompy.test.helpers import copy_and_fudge_mtime, assert_module_equivalence

from py2ts.codegen import emitmodule
from py2ts.options import CompilerOptions
from py2ts.errors import Errors
from py2ts.build import construct_groups
from py2ts.test.testutil import (
    ICODE_GEN_BUILTINS,
    TESTUTIL_PATH,
    use_custom_builtins,
    Py2tsDataSuite,
    assert_test_output,
    show_c,
    fudge_dir_mtimes,
)
from py2ts.test.test_serialization import check_serialization_roundtrip

files = [
    "run-functions.test",
    "run.test",
    "run-classes.test",
    "run-traits.test",
    "run-multimodule.test",
    "run-bench.test",
    "run-mypy-sim.test",
]

setup_format = """\
from setuptools import setup
from py2ts.build import morph

setup(name='test_run_output',
      ext_modules=morph({}, separate={}, skip_cgen_input={!r}, strip_asserts=False,
                           multi_file={}),
)
"""

WORKDIR = "build"


def run_setup(script_name: str, script_args: List[str]) -> bool:
    """Run a setup script in a somewhat controlled environment.

    This is adapted from code in distutils and our goal here is that is
    faster to not need to spin up a python interpreter to run it.

    We had to fork it because the real run_setup swallows errors
    and KeyboardInterrupt with no way to recover them (!).
    The real version has some extra features that we removed since
    we weren't using them.

    Returns whether the setup succeeded.
    """
    save_argv = sys.argv.copy()
    g = {"__file__": script_name}
    try:
        try:
            sys.argv[0] = script_name
            sys.argv[1:] = script_args
            with open(script_name, "rb") as f:
                exec(f.read(), g)
        finally:
            sys.argv = save_argv
    except SystemExit as e:
        # typeshed reports code as being an int but that is wrong
        code = cast(Any, e).code
        # distutils converts KeyboardInterrupt into a SystemExit with
        # "interrupted" as the argument. Convert it back so that
        # pytest will exit instead of just failing the test.
        if code == "interrupted":
            raise KeyboardInterrupt

        return code == 0 or code is None

    return True


@contextlib.contextmanager
def chdir_manager(target: str) -> Iterator[None]:
    dir = os.getcwd()
    os.chdir(target)
    try:
        yield
    finally:
        os.chdir(dir)


class TestRun(Py2tsDataSuite):
    """Test cases that build a C extension and run code."""

    files = files
    base_path = test_temp_dir
    optional_out = True
    multi_file = False
    separate = False

    def run_case(self, testcase: DataDrivenTestCase) -> None:
        # setup.py wants to be run from the root directory of the package, which we accommodate
        # by chdiring into tmp/
        with use_custom_builtins(
            os.path.join(self.data_prefix, ICODE_GEN_BUILTINS), testcase
        ), (chdir_manager("tmp")):
            self.run_case_inner(testcase)

    def run_case_inner(self, testcase: DataDrivenTestCase) -> None:
        os.mkdir(WORKDIR)

        text = "\n".join(testcase.input)

        with open("native.py", "w", encoding="utf-8") as f:
            f.write(text)
        with open("interpreted.py", "w", encoding="utf-8") as f:
            f.write(text)

        shutil.copyfile(TESTUTIL_PATH, "testutil.py")

        step = 1
        self.run_case_step(testcase, step)

        steps = testcase.find_steps()
        if steps == [[]]:
            steps = []

        for operations in steps:
            # To make sure that any new changes get picked up as being
            # new by distutils, shift the mtime of all of the
            # generated artifacts back by a second.
            fudge_dir_mtimes(WORKDIR, -1)

            step += 1
            with chdir_manager(".."):
                for op in operations:
                    if isinstance(op, UpdateFile):
                        # Modify/create file
                        copy_and_fudge_mtime(op.source_path, op.target_path)
                    else:
                        # Delete file
                        try:
                            os.remove(op.path)
                        except FileNotFoundError:
                            pass
            self.run_case_step(testcase, step)

    def run_case_step(
        self, testcase: DataDrivenTestCase, incremental_step: int
    ) -> None:
        bench = (
            testcase.config.getoption("--bench", False) and "Benchmark" in testcase.name
        )

        options = Options()
        options.use_builtins_fixtures = True
        options.show_traceback = True
        options.strict_optional = True
        # N.B: We try to (and ought to!) run with the current
        # version of python, since we are going to link and run
        # against the current version of python.
        # But a lot of the tests use type annotations so we can't say it is 3.5.
        options.python_version = max(sys.version_info[:2], (3, 6))
        options.export_types = True
        options.preserve_asts = True
        options.incremental = self.separate

        # Avoid checking modules/packages named 'unchecked', to provide a way
        # to test interacting with code we don't have types for.
        options.per_module_options["unchecked.*"] = {"follow_imports": "error"}

        source = build.BuildSource("native.py", "native", None)
        sources = [source]
        module_names = ["native"]
        module_paths = ["native.py"]

        # Hard code another module name to compile in the same compilation unit.
        to_delete = []
        for fn, text in testcase.files:
            fn = os.path.relpath(fn, test_temp_dir)

            if os.path.basename(fn).startswith("other") and fn.endswith(".py"):
                name = fn.split(".")[0].replace(os.sep, ".")
                module_names.append(name)
                sources.append(build.BuildSource(fn, name, None))
                to_delete.append(fn)
                module_paths.append(fn)

                shutil.copyfile(
                    fn, os.path.join(os.path.dirname(fn), name + "_interpreted.py")
                )

        for source in sources:
            options.per_module_options.setdefault(source.module, {})["mypyc"] = True

        separate = (
            self.get_separate("\n".join(testcase.input), incremental_step)
            if self.separate
            else False
        )

        groups = construct_groups(sources, separate, len(module_names) > 1)

        try:
            compiler_options = CompilerOptions(
                multi_file=self.multi_file, separate=self.separate
            )
            result = emitmodule.parse_and_typecheck(
                sources=sources,
                options=options,
                compiler_options=compiler_options,
                groups=groups,
                alt_lib_path=".",
            )
            errors = Errors()
            ir, cfiles = emitmodule.compile_modules_to_c(
                result, compiler_options=compiler_options, errors=errors, groups=groups,
            )
            if errors.num_errors:
                errors.flush_errors()
                assert False, "Compile error"
        except CompileError as e:
            for line in e.messages:
                print(line)
            assert False, "Compile error"

        # Check that serialization works on this IR. (Only on the first
        # step because the the returned ir only includes updated code.)
        if incremental_step == 1:
            check_serialization_roundtrip(ir)

        setup_file = os.path.abspath(os.path.join(WORKDIR, "setup.py"))
        # We pass the C file information to the build script via setup.py unfortunately
        with open(setup_file, "w", encoding="utf-8") as f:
            f.write(
                setup_format.format(module_paths, separate, cfiles, self.multi_file)
            )

        if not run_setup(setup_file, ["build_ext", "--inplace"]):
            if testcase.config.getoption("--mypyc-showc"):
                show_c(cfiles)
            assert False, "Compilation failed"

        # Assert that an output file got created
        suffix = "pyd" if sys.platform == "win32" else "so"
        assert glob.glob("native.*.{}".format(suffix))

        driver_path = "driver.py"
        env = os.environ.copy()
        env["MYPYC_RUN_BENCH"] = "1" if bench else "0"

        # XXX: This is an ugly hack.
        if "MYPYC_RUN_GDB" in os.environ:
            if platform.system() == "Darwin":
                subprocess.check_call(
                    ["lldb", "--", sys.executable, driver_path], env=env
                )
                assert False, (
                    "Test can't pass in lldb mode. (And remember to pass -s to "
                    "pytest)"
                )
            elif platform.system() == "Linux":
                subprocess.check_call(
                    ["gdb", "--args", sys.executable, driver_path], env=env
                )
                assert False, (
                    "Test can't pass in gdb mode. (And remember to pass -s to "
                    "pytest)"
                )
            else:
                assert False, "Unsupported OS"

        proc = subprocess.Popen(
            [sys.executable, driver_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=env,
        )
        output = proc.communicate()[0].decode("utf8")
        outlines = output.splitlines()

        if testcase.config.getoption("--mypyc-showc"):
            show_c(cfiles)
        if proc.returncode != 0:
            print()
            print("*** Exit status: %d" % proc.returncode)

        # Verify output.
        if bench:
            print("Test output:")
            print(output)
        else:
            if incremental_step == 1:
                msg = "Invalid output"
                expected = testcase.output
            else:
                msg = "Invalid output (step {})".format(incremental_step)
                expected = testcase.output2.get(incremental_step, [])

            assert_test_output(testcase, outlines, msg, expected)

        if incremental_step > 1 and options.incremental:
            suffix = "" if incremental_step == 2 else str(incremental_step - 1)
            expected_rechecked = testcase.expected_rechecked_modules.get(
                incremental_step - 1
            )
            if expected_rechecked is not None:
                assert_module_equivalence(
                    "rechecked" + suffix,
                    expected_rechecked,
                    result.manager.rechecked_modules,
                )
            expected_stale = testcase.expected_stale_modules.get(incremental_step - 1)
            if expected_stale is not None:
                assert_module_equivalence(
                    "stale" + suffix, expected_stale, result.manager.stale_modules
                )

        assert proc.returncode == 0

    def get_separate(self, program_text: str, incremental_step: int) -> Any:
        template = r"# separate{}: (\[.*\])$"
        m = re.search(
            template.format(incremental_step), program_text, flags=re.MULTILINE
        )
        if not m:
            m = re.search(template.format(""), program_text, flags=re.MULTILINE)
        if m:
            return ast.literal_eval(m.group(1))
        else:
            return True


# Run the main multi-module tests in multi-file compilation mode
class TestRunMultiFile(TestRun):
    multi_file = True
    test_name_suffix = "_multi"
    files = [
        "run-multimodule.test",
        "run-mypy-sim.test",
    ]


# Run the main multi-module tests in separate compilation mode
class TestRunSeparate(TestRun):
    separate = True
    test_name_suffix = "_separate"
    files = [
        "run-multimodule.test",
        "run-mypy-sim.test",
    ]
