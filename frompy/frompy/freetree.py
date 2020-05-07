"""Generic node traverser visitor"""

from frompy.traverser import TraverserVisitor
from frompy.nodes import Block, FrompyFile


class TreeFreer(TraverserVisitor):
    def visit_block(self, block: Block) -> None:
        super().visit_block(block)
        block.body.clear()


def free_tree(tree: FrompyFile) -> None:
    """Free all the ASTs associated with a module.

    This needs to be done recursively, since symbol tables contain
    references to definitions, so those won't be freed but we want their
    contents to be.
    """
    tree.accept(TreeFreer())
    tree.defs.clear()
