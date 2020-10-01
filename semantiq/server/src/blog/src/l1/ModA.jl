using ..Blog: A, B, C, Node

walk(n::Node,cb::Function;kw...) = cb(n;kw...)
update(n::A,a1;_...)::A = n.m.a1 = a1; n
update(n::B,b2;_...)::B = n.m.b2 = b2; n
update(n::C,c2;_...)::C = n.m.c2 = c2; n
