import ast
import sys

is_py36 = sys.version_info >= (3, 6)

if is_py36:
    assign_types = (ast.Assign, ast.AnnAssign)
else:
    assign_types = (ast.Assign, )
