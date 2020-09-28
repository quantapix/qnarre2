module is
using ..Blog: Kind, A, B, C, Node
import .Frame: is

kind<K extends Kind, C extends { k: K }>(c: C, n?: qt.Nobj): n is Ctr<C['k']> {
  return n?.k === c.k;
}
a(k::Kind, qf=nothing) = k == Kind.A
b(k::Kind, qf=nothing) = k == Kind.B
b(n::Node,qf=nothing) = b(n.k)
c(n::Node,qf=nothing) = n.k == Kind.C
end

module get
using ..Blog: Kind, A, B, C, Node
import .Frame: get

v(n?: qt.Node): number | undefined {
  switch (n?.k) {
    case Kind.A:
      return n.a1;
    case Kind.B:
      return n.b1;
    case Kind.C:
      return n.c1;
  }
  return;
}
b2(n: qt.Node) {
  if (qf.is.b(n)) return n.b2;
  return;
}
c2(n: qt.Node) {
  if (qf.is.c(n)) return n.c2;
  return;
}


n<K extends Kind.A | Kind.B | Kind.C>(k: K) {
  return new q1.Nmap[k]();
}

x = 1
y = 2
xy() = 1 + 2
function string(f::Frame, i::Fis, s)
    return isa(s, String)
end
for n in names(@__MODULE__; all=true)
    if Base.isidentifier(n) && n ∉ (Symbol(@__MODULE__), :eval, :include)
        @eval export $n
    end
end
end

module get
using ..frame: Fget, Frame
function empty(f::Frame, g::Fget)
    return
end
end

function newFrame()
  
end
