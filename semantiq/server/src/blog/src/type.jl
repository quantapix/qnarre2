abstract type Nmut <: Dmut end

mutable struct Vn <: Nmut
    n2::Union{Number,Nothing}
    d2::Union{Number,Nothing}
    Vn(n2=nothing, d2=nothing) = new(n2, d2)
end

abstract type Nobj{H,V <: Nmut} <: Ndat{V} end

@enum Kind kA kB kC kAB kBC kABC

struct On{X,V <: Vn} <: Nobj{X,V}
    k::Kind
    d1::Number
    n1::Number
    x::X
    v::V
    On{X,V}(k::Kind, n1, x::X, v::V) where {X,V} = new(k, 123, n1, x, v)
end

n1(;_...) = nothing
n1(n::Nobj;_...) = n.n1

struct Xa end

mutable struct Va <: Nmut
    a1::Number
    n2::Union{Number,Nothing}
    d2::Union{Number,Nothing}
    Va(a1, n2=nothing, d2=nothing) = new(a1, n2, d2)
end

struct Xb
    b1::Number
end

mutable struct Vb <: Nmut
    b2::Number
    n2::Union{Number,Nothing}
    d2::Union{Number,Nothing}
    Vb(b2, n2=nothing, d2=nothing) = new(b2, n2, d2)
end

struct Xc end

mutable struct Vc <: Nmut
    c1::Union{Number,Nothing}
    c2::Union{Number,Nothing}
    n2::Union{Number,Nothing}
    d2::Union{Number,Nothing}
    Vc(c1, c2, n2=nothing, d2=nothing) = new(c1, c2, n2, d2)
end

abstract type A <: Nobj{Xa,Va} end
abstract type B <: Nobj{Xb,Vb} end
abstract type C <: Nobj{Xc,Vc} end

Node = Union{A,B,C}