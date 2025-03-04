---
layout: center
---

# 午後の部


---
layout: center
---

# みなさんだいぶお疲れかもしれませんが、


---
layout: center
---

# 最後にRuby VMの続きの話をします


---
layout: center
---

## VMでLinearになった命令列ですが<br>もっと最適化をかけることができます


---
layout: center
---

## JIT Compiler 🚀

---
layout: default
---

# JIT Compilerとは
<h2 v-click>Just in Time Compiler</h2>
<p class='text-xl' v-click>
  ソフトウェアの実行時にソースコードをコンパイルするコンパイラのこと。通常のコンパイラはコンパイルを実行前に事前に行い、これをJITと対比して事前コンパイラ (ahead-of-timeコンパイラ、AOTコンパイラ)と呼ぶ。(<a href="https://ja.wikipedia.org/wiki/%E5%AE%9F%E8%A1%8C%E6%99%82%E3%82%B3%E3%83%B3%E3%83%91%E3%82%A4%E3%83%A9" target="_blank">wikipedia</a>)
</p>

<p class="text-xl" v-click><strong>Rubyだと実行時にYARV命令列の一部を機械語の命令列<span class="text-xs">※</span>に置き換えて実行する方式を取る</strong></p>


<h2 v-click> 他の処理系だと</h2>
<p class='text-xl' v-click>
JVM(C1, C2, 階層的コンパイラ)やJavaScript(Turbofan), Dartにも搭載されている機能
</p>


---
layout: default
---

# Ruby JITの変遷
<div v-click>
  <h2 class="m-0">MJIT</h2>
  <p class='text-xl mt-2 mb-4'>
  <strong>Ruby 2.6</strong>で追加されたJIT Compiler<br>
  実行時に一部の処理をC言語にコンパイルすることで高速化を図ったが、<br>Railsアプリケーションなどを使った本番環境であまり有用性を示せなかった
  </p>
</div>

<div v-click>
  <h2 class="m-0">YJIT</h2>
  <p class='text-xl mt-2 mb-4'>
    <strong>Ruby 3.1</strong>から登場。
    本番環境で十分に使えることを目的に作られ、<br>Railsアプリケーションでも高いパフォーマンスを発揮することが可能となった
  </p>
  <p class='text-xl mt-2 mb-4'>
    <strong>Ruby 3.2</strong>からは実装がCからRustに置き換わった
  </p>
</div>

<div v-click>
  <h2 class="m-0">RJIT</h2>
  <p class='text-xl mt-2 mb-4'>
  <strong>Ruby 3.3</strong>から登場。Rubyで書かれたJIT Compiler<br>
  <a href="https://bugs.ruby-lang.org/issues/21116" target="_blank" class="text-sm">最近Rubyのmain repositoryから外す議論があるらしい</a>
  </p>
</div>


---
layout: center
---

<div class="flex items-center flex-col">
  <img src="/public/yjit.png" class="w-3/4"/>
  <h1 class="!mt-4">Yet Another Just In Time compiler</h1>
</div>


---
layout: center
---

<div class="flex items-center flex-col">
  <img src="/public/yjit-arch.png" class="w-full"/>
</div>


---
layout: center
---

# YJITの効果をみてみる

---
layout: center
---

```rb{*}{maxHeight: '500px', class:'!children:text-xs'}
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
```

---
layout: center
---

```sh{*}{maxHeight: '500px', class:'!children:text-base'}
❯ ruby yjit.bench.rb
Ruby version: 3.4.2
YJIT enabled at start?: false
                 user     system      total        real
No YJIT      0.389221   0.001059   0.390280 (  0.390663)
YJIT on      0.278871   0.001404   0.280275 (  0.282141)
```

---
layout: center
---

<div class="flex items-center flex-col">
  <img src="/public/yjit-bench-multi.png" class="w-3/4"/>
  <a href="https://speakerdeck.com/k0kubun/rubykaigi-2024?slide=2" target="_blank">ref</a>
</div>


---
layout: default
---

# JIT compileがどこで/いつ行われているか


---
layout: default
---

# LBBV
