using Test

@test 1 == 1

@testset "Base" begin
  include("base.jl")
end

@testset "Type" begin
  include("type.jl")
end
