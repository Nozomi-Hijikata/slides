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
layout: center
---

# そもそもVMってどうやって命令列を捌いているの？


---
layout: center
---

# JIT compileがVMからどう見えているか


---
layout: center
---

```c{*}{maxHeight: '500px', class:'!children:text-sm'}
// insns.def
/* invoke method. */
DEFINE_INSN
send
(CALL_DATA cd, ISEQ blockiseq)
(...)
(VALUE val)
// attr rb_snum_t sp_inc = sp_inc_of_sendish(cd->ci);
// attr rb_snum_t comptime_sp_inc = sp_inc_of_sendish(ci);
{
    VALUE bh = vm_caller_setup_arg_block(ec, GET_CFP(), cd->ci, blockiseq, false);
    val = vm_sendish(ec, GET_CFP(), cd, bh, mexp_search_method);
    JIT_EXEC(ec, val);

    if (UNDEF_P(val)) {
        RESTORE_REGS();
        NEXT_INSN();
    }
}
```

`insns.def`で命令列の定義をしている

---
layout: center
---

```c{*}{maxHeight: '400px', class:'!children:text-xs'}
//vm.inc
/* insn send(cd, blockiseq)(...)(val) */
INSN_ENTRY(send)
{
    /* ###  Declare that we have just entered into an instruction. ### */
    START_OF_ORIGINAL_INSN(send);
    /* ###  Declare and assign variables. ### */
    CALL_DATA cd = (CALL_DATA)GET_OPERAND(1);
    ISEQ blockiseq = (ISEQ)GET_OPERAND(2);
    VALUE val;
    /* ### Instruction preambles. ### */
    ADD_PC(INSN_ATTR(width));
    POPN(INSN_ATTR(popn));
    //...
    /* ### Here we do the instruction body. ### */
#   define NAME_OF_CURRENT_INSN send
#   line 849 "../ruby/insns.def"
{
    VALUE bh = vm_caller_setup_arg_block(ec, GET_CFP(), cd->ci, blockiseq, false);
    val = vm_sendish(ec, GET_CFP(), cd, bh, mexp_search_method);
    JIT_EXEC(ec, val);

    if (UNDEF_P(val)) {
        RESTORE_REGS();
        NEXT_INSN();
    }
}
#   line 2393 "vm.inc"
#   undef NAME_OF_CURRENT_INSN
    /* ### Instruction trailers. ### */
    //...
    PUSH(val);
#   undef INSN_ATTR
    /* ### Leave the instruction. ### */
    END_INSN(send);
}
```

これは`tool/insns2vm.rb`によって`erb`で展開されて、`vm.inc`になる

`JIT_EXEC`マクロでJITを呼び出していそう！！

---
layout: center
---


```c{*}{maxHeight: '400px', class:'!children:text-xs'}
// vm_exec.h
// Run the JIT from the interpreter
#define JIT_EXEC(ec, val) do { \
    rb_jit_func_t func; \
    /* don't run tailcalls since that breaks FINISH */ \
    if (UNDEF_P(val) && GET_CFP() != ec->cfp && (func = jit_compile(ec))) { \
        val = func(ec, ec->cfp); \
        if (ec->tag->state) THROW_EXCEPTION(val); \
    } \
} while (0)
```

`JIT_EXEC`の中身は↑

`jit_compile`が大事そう


---
layout: center
---


```c{*}{maxHeight: '400px', class:'!children:text-xs'}
// vm.c
static inline rb_jit_func_t
jit_compile(rb_execution_context_t *ec)
{
    const rb_iseq_t *iseq = ec->cfp->iseq;
    struct rb_iseq_constant_body *body = ISEQ_BODY(iseq);

    // Increment the ISEQ's call counter and trigger JIT compilation if not compiled
    if (body->jit_entry == NULL && rb_yjit_enabled_p) {
        body->jit_entry_calls++;
        if (rb_yjit_threshold_hit(iseq, body->jit_entry_calls)) {
            rb_yjit_compile_iseq(iseq, ec, false);
        }
    }
    return body->jit_entry;
}
```

`rb_yjit_threshold_hit`で何回メソッドを呼び出しているかのチェックをしていることがわかる

```c
// Number of calls used to estimate how hot an ISEQ is
#define YJIT_CALL_COUNT_INTERV 20u // 20回!!
```

`rb_yjit_compile_iseq`がコンパイルの本体のようだ

---
layout: center
---


```c{*}{maxHeight: '400px', class:'!children:text-xs'}
// yjit.c
void
rb_yjit_compile_iseq(const rb_iseq_t *iseq, rb_execution_context_t *ec, bool jit_exception)
{
    RB_VM_LOCK_ENTER();
    rb_vm_barrier();

    // Compile a block version starting at the current instruction
    uint8_t *rb_yjit_iseq_gen_entry_point(const rb_iseq_t *iseq, rb_execution_context_t *ec, bool jit_exception); // defined in Rust
    uintptr_t code_ptr = (uintptr_t)rb_yjit_iseq_gen_entry_point(iseq, ec, jit_exception);

    if (jit_exception) {
        iseq->body->jit_exception = (rb_jit_func_t)code_ptr;
    }
    else {
        iseq->body->jit_entry = (rb_jit_func_t)code_ptr;
    }

    RB_VM_LOCK_LEAVE();
}
```

`rb_yjit_iseq_gen_entry_point`がRust側で定義されたjit compilerの実体

こいつが`rb_jit_func_t`という関数へのポインタを返すので、`iseq->body->jit_entry`にキャッシュする

```c
// vm_core.h
typedef VALUE (*rb_jit_func_t)(struct rb_execution_context_struct *, struct rb_control_frame_struct *);
```


---
layout: center
---

```rust
/// Called from C code to begin compiling a function
/// NOTE: this should be wrapped in RB_VM_LOCK_ENTER(), rb_vm_barrier() on the C side
/// If jit_exception is true, compile JIT code for handling exceptions.
/// See jit_compile_exception() for details.
#[no_mangle]
pub extern "C" fn rb_yjit_iseq_gen_entry_point(iseq: IseqPtr, ec: EcPtr, jit_exception: bool) -> *const u8 {
    //...
    let maybe_code_ptr = with_compile_time(|| { gen_entry_point(iseq, ec, jit_exception) });

    match maybe_code_ptr {
        Some(ptr) => ptr,
        None => std::ptr::null(),
    }
}
```

Rust側で公開されている`rb_yjit_iseq_gen_entry_point`

C側とABIを揃えるために`pub extern "C"`で揃えている

<p class="text-sm">
  ※ABI: 関数の引数などに対してどのレジスタを使うのか、戻り値をどこに格納するのか/スタックフレームをどう扱うかなどの規約
</p>

<v-click>
  <p class="text-xl font-bold">
    VMから見ると単にjit compilerが用意してくれた関数をキャッシュしておいてそれを呼び出している
  </p>
</v-click>







