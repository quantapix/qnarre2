module Blog

NorN = Union{Number,Nothing}

include("base.jl")
include("types.jl")
include("l1/L1.jl")
#include("l2/L2.jl")
#include("l2b/L2b.jl")
#include("l3/L3.jl")
#include("l4/L4.jl")

greet() = print("Hello World!")

end
