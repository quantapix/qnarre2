# This tests various f-string parsing and analysis cases.

# Test nested f-strings.
a = f'hello { f"hi {1}" } bye { f"hello" }'


# Test f-string with a backslash in the expression.
# This should generate an error.
b = f"hello { \t1 }"


# Test f-string with unterminated expression.
# This should generate an error.
c = f"hello { 1 "


# Test f-string with double braces.
d = f"hello {{{1}}}"

# Test f-string with formatting directives.
e = f"hello { 2 != 3 !r:2 }"

# Test f-string with formatting directives.
f = f"hello { 2 != 3 :3 }"

# Test f-string with embedded colon.
g = f"hello { a[2:3] :3 }"

# Test f-string with embedded bang.
g = f"hello { b['hello!'] :3 }"
