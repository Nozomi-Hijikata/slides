---
theme: geist
colorSchema: light

layout: center

drawings:
  persist: false

transition: slide-left

mdc: true
---

# RubyKaigi 2026 予習Bootcamp 
### 速習JITコンパイラ

### 

2026/03/30 MS芝浦ビル

技術部　土方

---
layout: center
---

# 今日最後ですね

---
layout: center
---

# 最後はJIT CompilerにDeep Diveしていきます

---
layout: center
---

## そもそもVMとはJITとはみたいなのはいいですね...? (skip)

何度か喋っていると思うので

[過去資料はここに](https://github.com/Nozomi-Hijikata/slides)

---
layout: center
---

<div class='flex justify-center' >
  <img src='/public/zjit-enhanced.png' class='w-full'/>
</div>

---
layout: center
---

## 細かい話をする前に、ひとまず一巡した方がいいと思うので、

---
layout: center
---

## Entrypointから順に実装ベースでみていく

---
layout: center
---

`JIT_EXEC`なるマクロがあり、それをVM命令dispatch時に呼び出すことでEntry

```c
// Run the JIT from the interpreter
#define JIT_EXEC(ec, val) do { \
    /* don't run tailcalls since that breaks FINISH */ \
    if (UNDEF_P(val) && GET_CFP() != ec->cfp) { \
        rb_zjit_func_t zjit_entry; \
        if ((zjit_entry = (rb_zjit_func_t)rb_zjit_entry)) { \
            rb_jit_func_t func = zjit_compile(ec); \
            if (func) { \
                val = zjit_entry(ec, ec->cfp, func); \
            } \
        } \
    } \
} while (0)

```


<Footnotes>
  細かく言えばtop frame用に`jit_exec`もあるが省略
</Footnotes>

---
layout: center
---

`JIT_EXEC`はsend命令の中で呼び出しされるんでしたね

```c{all|21}{maxHeight: '400px', class:'!children:text-xs'}
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


<Footnotes center>
2025 予習Bootcampより再掲
</Footnotes>

---
layout: center
---

`zjit_compile`を続けてみていく

```c{*|5-10}
// Run the JIT from the interpreter
#define JIT_EXEC(ec, val) do { \
    /* don't run tailcalls since that breaks FINISH */ \
    if (UNDEF_P(val) && GET_CFP() != ec->cfp) { \
        rb_zjit_func_t zjit_entry; \
        if ((zjit_entry = (rb_zjit_func_t)rb_zjit_entry)) { \
            rb_jit_func_t func = zjit_compile(ec); \
            if (func) { \
                val = zjit_entry(ec, ec->cfp, func); \
            } \
        } \
    } \
} while (0)

```
---
layout: default
---

### やっていることはシンプル

<ol>
  <li>1. 呼び出されるたびにカウンターをincrement</li>
  <li>2. 一定の閾値に達したらprofile用に命令列をZJIT profile用に差し替え</li>
  <li>3. 一定の閾値に達したら<code>rb_zjit_compile_iseq</code>を呼び出してjit compileする</li>
</ol>

```c{*|5|6-10|11-14}{maxHeight: '320px', class:'!children:text-xs'}
static inline rb_jit_func_t zjit_compile(rb_execution_context_t *ec) {
    const rb_iseq_t *iseq = ec->cfp->iseq;
    struct rb_iseq_constant_body *body = ISEQ_BODY(iseq);
    if (body->jit_entry == NULL) {
        body->jit_entry_calls++;
        // At profile-threshold, rewrite some of the YARV instructions
        // to zjit_* instructions to profile these instructions.
        if (body->jit_entry_calls == rb_zjit_profile_threshold) {
            rb_zjit_profile_enable(iseq);
        }
        // At call-threshold, compile the ISEQ with ZJIT.
        if (body->jit_entry_calls == rb_zjit_call_threshold) {
            rb_zjit_compile_iseq(iseq, false);
        }
    }
    return body->jit_entry;
}
```

<Footnotes center>
Profilingは後述
</Footnotes>

---
layout: center
---

`rb_zjit_iseq_gen_entrypoint`がRust側のCompile処理を呼び出す

```c{*|9|15}{maxHeight: '400px', class:'!children:text-xs'}
void
rb_zjit_compile_iseq(const rb_iseq_t *iseq, bool jit_exception)
{
    RB_VM_LOCKING() {
        rb_vm_barrier();

        // Compile a block version starting at the current instruction
        uint8_t *rb_zjit_iseq_gen_entry_point(const rb_iseq_t *iseq, bool jit_exception); // defined in Rust
        uintptr_t code_ptr = (uintptr_t)rb_zjit_iseq_gen_entry_point(iseq, jit_exception);

        if (jit_exception) {
            iseq->body->jit_exception = (rb_jit_func_t)code_ptr;
        }
        else {
            iseq->body->jit_entry = (rb_jit_func_t)code_ptr;
        }
    }
}
```

---
layout: center
---

compileされた`jit_entry`(`func`)を使って`zjit_entry`に処理を移譲していますね

```c{*|7-10}
// Run the JIT from the interpreter
#define JIT_EXEC(ec, val) do { \
    /* don't run tailcalls since that breaks FINISH */ \
    if (UNDEF_P(val) && GET_CFP() != ec->cfp) { \
        rb_zjit_func_t zjit_entry; \
        if ((zjit_entry = (rb_zjit_func_t)rb_zjit_entry)) { \
            rb_jit_func_t func = zjit_compile(ec); \
            if (func) { \
                val = zjit_entry(ec, ec->cfp, func); \
            } \
        } \
    } \
} while (0)
```

---
layout: center
---

`rb_zjit_entry`をみていくと

```c{*|7-10}

```


---
layout: center
---

# ちょっとずつ見えてきましたね！



<!-- TODO: JIT ENTRY POINT 速習 -->

---
layout: center
---

# では各段階での最適化をみていく

---
layout: default
---

## 最適化の考え方

<ul class="text-sm">
  <v-click>
    <li class="mb-3"><strong class="text-lg">命令の実行回数を減らす</strong>
      <ul class="text-xs">
        <li>一度実行した結果を再利用する</li>
        <li>コンパイル時に実行できるもののは実行する</li>
        <li>冗長な命令を削除する</li>
        <li>実行回数を減らす様にプログラムの形を変形する</li>
        <li>特殊化する</li>
        <li> etc...</li>
      </ul>
    </li>
  </v-click>
  <v-click>
    <li class="mb-3"><strong class="text-lg">より速い命令を使う</strong>
      <ul class="text-xs">
        <li>レジスタアクセスを利用する</li>
        <li>計算機で使える高性能な命令を利用する</li>
        <li>メモリアクセスの局所性を高めてキャッシュにあたりやすくする</li>
        <li>より単純な命令を利用する</li>
      </ul>
    </li>
  </v-click>
  <v-click>
    <li class="mb-3"><strong class="text-lg">並列度を上げる</strong>
      <ul class="text-xs">
        <li>命令レベルで並列化する（スーパースカラ etc..）</li>
        <li>プロセッサレベルで並列化する (並列計算機（分散メモリ・共有メモリ）)</li>
      </ul>
    </li>
  </v-click>
</ul>

<Footnotes>
  ref: コンパイラの構成と最適化 第2版, 中田育男, 2009<br>
</Footnotes>



