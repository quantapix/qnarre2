module is
using ..Blog: Kind, A, B, C, Node
import .Frame: is
a(k::Kind, qf=nothing) = k == Kind.kA
b(k::Kind, qf=nothing) = k == Kind.kB
b(n::Node,qf=nothing) = b(n.k)
c(n::Node,qf=nothing) = n.k == Kind.kC
end

module get
using ..Blog: Kind, A, B, C, Node
import .Frame: get
d1()
v(x) = nothing
v(n::A) = n.v.a1
v(n::B) = n.x.b1
v(n::C) = n.v.c1
b2(x) = nothing
b2(n::B) = n.v.b2;
c2(n: qt.Node) {
  if (qf.is.c(n)) return n.c2;
  return;
}


n<K extends Kind.A | Kind.B | Kind.C>(k: K) {
  return new q1.Nmap[k]();
}

kind<K extends Kind, C extends { k: K }>(c: C, n?: qt.Nobj): n is Ctr<C['k']> {
  return n?.k === c.k;
}
