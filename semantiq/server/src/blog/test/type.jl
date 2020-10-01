using Blog: On, kA, Ca, Ma, n1, d2

a = On{Ca,Ma}(kA, 1, Ca(), Ma(2))
@test a.k == kA
@test a.n1 == 1
@test n1(a) == 1
@test a.m.a1 == 2
@test a.m.n2 === nothing
d2(a, 3)
@test d2(a) == 3
@test a.m.d2 == 3

using Blog: kB, Cb, Mb

b = On{Cb,Mb}(kB, 1, Cb(2), Mb(3))
@test b.k == kB
@test b.n1 == 1
@test n1(b) == 1
@test b.c.b1 == 2
@test b.m.b2 === 3
d2(b, 4)
@test d2(b) == 4
@test b.m.d2 == 4
