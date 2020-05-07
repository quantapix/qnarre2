from typing import Optional, Callable, List, Tuple

from frompy.plugin import Plugin
from frompy.nodes import MypyFile


class DepsPlugin(Plugin):
    def get_additional_deps(self, file: MypyFile) -> List[Tuple[int, str, int]]:
        if file.fullname == '__main__':
            return [(10, 'err', -1)]
        return []


def plugin(version):
    return DepsPlugin
