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
