abstract type Dmut end

mutable struct Md <: Dmut
  d2::Union{Number,Nothing}
  Md(d2=nothing) = new(d2)
end

abstract type Ndat{M <: Dmut} end

struct Od{M <: Md} <: Ndat{M}
    d1::Number
    m::M
end

d1(;_...) = nothing
d1(d::Ndat;_...) = d.d1
d2(;_...) = nothing
d2(d::Ndat;_...) = d.m.d2
d2(d::Ndat,d2;_...) = d.m.d2 = d2

module Frame

module get
function empty(qf=nothing)
    return
end
end

module is
function string(x, qf=nothing)
    return isa(x, String)
end
end

end

#= 
for n in names(@__MODULE__; all=true)
  if Base.isidentifier(n) && n ∉ (Symbol(@__MODULE__), :eval, :include)
      @eval export $n
  end
end =#
