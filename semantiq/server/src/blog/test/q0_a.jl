using Blog: Od, Md, d1, d2

o = Od(1, Md(2))
@test o.d1 == 1
@test d1(o) == 1
@test o.m.d2 == 2
@test d2(o) == 2
d2(o, 3)
@test d2(o) == 3
