from typing import Union, Optional

from frompy.errors import Errors
from frompy.options import Options
from frompy.nodes import FrompyFile
from frompy import fastparse


def parse(
    source: Union[str, bytes],
    fnam: str,
    module: Optional[str],
    errors: Optional[Errors],
    options: Options,
) -> FrompyFile:
    if options.transform_source is not None:
        source = options.transform_source(source)
    return fastparse.parse(
        source, fnam=fnam, module=module, errors=errors, options=options
    )
