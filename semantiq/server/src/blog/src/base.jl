mutable struct D2
  d2::Number
end
struct Data
    d1::Number
    d2::Union{D2,Nothing}
    function Data(d2::Union{D2, Nothing})
        new(123, d2)
    end
end
abstract type Fget end
abstract type Fis end
abstract type Frame{G <: Fget, I <: Fis} end
function empty(f::Frame, g::Fget)
  return
end
function ()
  
end
