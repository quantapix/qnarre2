@enum Kind kA kB kC kAB kBC kABC

struct Nobj{X,V}
  k::Kind
  d1
  n1::Number
  x::E
  v::V
  Nobj(k::Kind, n1, x::E, v::V) = new(k, 123, n1, x, v)
end

mutable struct Va
  d2::Union{Number,Nothing}
  a1::Number
  Va(a1, d2=nothing) = new(a1, d2)
end

struct Xb
  b1::Number
end

mutable struct Vb
  d2::Union{Number,Nothing}
  b2::Number
end

mutable struct Vc
  d2::Union{Number,Nothing}
  c1::Union{Number,Nothing}
  c2::Union{Number,Nothing}
end

abstract type A <: Nobj{{},Va} end
abstract type B <: Nobj{Xb,Vb} end
abstract type C <: Nobj{{},Vc} end

Node = Union{A,B,C}
