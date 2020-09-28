abstract type Dvar end

mutable struct Vd <: Dvar
  d2::Union{Number,Nothing}
  Vd(d2=nothing) = new(d2)
end

abstract type Ndat{V <: Dvar} end

struct Od{V <: Vd} <: Ndat{V}
    d1::Number
    v::V
end

d1(_...) = nothing
d1(d::Ndat,_...) = d.d1
d2(_...) = nothing
d2(d::Ndat,_...) = d.v.d2
d2(d::Ndat,d2,_...) = d.v.d2 = d2

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
