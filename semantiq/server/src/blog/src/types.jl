abstract type Nmut <: Dmut end

mutable struct Mn <: Nmut
    n2::Union{Number,Nothing}
    d2::Union{Number,Nothing}
    Mn(n2=nothing, d2=nothing) = new(n2, d2)
end

abstract type Nobj{C,M <: Nmut} <: Ndat{M} end

@enum Kind kA kB kC kAB kBC kABC

struct On{C,M <: Nmut} <: Nobj{C,M}
    k::Kind
    d1::Number
    n1::Number
    c::C
    m::M
    On{C,M}(k::Kind, n1, c::C, m::M) where {C,M} = new(k, 123, n1, c, m)
end

n1(;_...) = nothing
n1(n::Nobj;_...) = n.n1

struct Ca end

mutable struct Ma <: Nmut
    a1::Number
    n2::Union{Number,Nothing}
    d2::Union{Number,Nothing}
    Ma(a1, n2=nothing, d2=nothing) = new(a1, n2, d2)
end

struct Cb
    b1::Number
end

mutable struct Mb <: Nmut
    b2::Number
    n2::Union{Number,Nothing}
    d2::Union{Number,Nothing}
    Mb(b2, n2=nothing, d2=nothing) = new(b2, n2, d2)
end

struct Cc end

mutable struct Mc <: Nmut
    c1::Union{Number,Nothing}
    c2::Union{Number,Nothing}
    n2::Union{Number,Nothing}
    d2::Union{Number,Nothing}
    Mc(c1, c2, n2=nothing, d2=nothing) = new(c1, c2, n2, d2)
end

abstract type A <: Nobj{Ca,Ma} end
abstract type B <: Nobj{Cb,Mb} end
abstract type C <: Nobj{Cc,Mc} end

Node = Union{A,B,C}