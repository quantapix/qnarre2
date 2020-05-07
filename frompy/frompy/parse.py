from typing import Union, Optional

from frompy.errors import Errors
from frompy.options import Options
from frompy.nodes import FrompyFile


def parse(
    source: Union[str, bytes],
    fnam: str,
    module: Optional[str],
    errors: Optional[Errors],
    options: Options,
) -> FrompyFile:
    """Parse a source file, without doing any semantic analysis.

    Return the parse tree. If errors is not provided, raise ParseError
    on failure. Otherwise, use the errors object to report parse errors.

    The python_version (major, minor) option determines the Python syntax variant.
    """
    is_stub_file = fnam.endswith(".pyi")
    if options.transform_source is not None:
        source = options.transform_source(source)
    if options.python_version[0] >= 3 or is_stub_file:
        import frompy.fastparse

        return mypy.fastparse.parse(
            source, fnam=fnam, module=module, errors=errors, options=options
        )
    else:
        import frompy.fastparse2
        return mypy.fastparse2.parse(
            source, fnam=fnam, module=module, errors=errors, options=options
        )

