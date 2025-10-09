# yjit_bench.rb
require 'benchmark'

puts "Ruby version: #{RUBY_VERSION}"
puts "YJIT enabled at start?: #{RubyVM::YJIT.enabled?}"

def hot_method(n)
  sum = 0
  n.times { sum += 1 }
  sum
end

N = 10_000_000

Benchmark.bm(10) do |x|
  x.report("No YJIT") do
    hot_method(N)
  end

  x.report("YJIT on") do
    RubyVM::YJIT.enable
    hot_method(N)
  end
end
