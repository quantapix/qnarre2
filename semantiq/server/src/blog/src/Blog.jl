module Blog

NorN = Union{Number,Nothing}

include("q0_a.jl")
include("q0_b.jl")
include("q1/q1.jl")
#include("q2/q2.jl")
#include("q2b/q2b.jl")
#include("q3/q3.jl")
#include("q4/q4.jl")

greet() = print("Hello World!")

end
