using Test

@test 1 == 1

@testset "Base" begin
  include("Base.jl")
end

@testset "Type" begin
  include("Type.jl")
end
