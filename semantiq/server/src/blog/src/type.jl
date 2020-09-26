include("base.jl")

@enum Kind A, B, C, AB, BC, ABC

struct Nobj
  k::Kind
  n1::Number
  n2::Union{Number, Nothing}

  name::Symbol
  params::Vector{Symbol}
  context::Context
  doc::Union{String,Nothing}

  function TypeConstructor(name::Symbol, params::Vector,
                           context::Context, doc=nothing)
    new(name, params, context, doc)
  end
end