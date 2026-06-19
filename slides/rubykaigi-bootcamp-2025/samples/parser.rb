require 'ripper'

example = <<~EXAMPLE
  def foo(a,b)
    puts a + b
  end
  foo(9,8)
EXAMPLE

pp Ripper.sexp(example)
