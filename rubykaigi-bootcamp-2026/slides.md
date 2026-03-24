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
### Walking around CRuby's JIT Compiler

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

※ 正直あの図だけではわかった気がしないと思うので

---
layout: center
---

## Entrypointから順に実装ベースでみていく

---
layout: center
---

### `JIT_EXEC`なるマクロがあり、それをVM命令dispatch時に呼び出すことでEntry

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

### `JIT_EXEC`はsend命令の中で呼び出しされるんでしたね

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


<Footnotes>
2025 予習Bootcampより再掲
</Footnotes>

---
layout: center
---

### `zjit_compile`でISEQをコンパイル

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

### Counterを使ってCompileの有無を判定

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

<Footnotes>
Profilingは後述
</Footnotes>

---
layout: center
---

### `rb_zjit_iseq_gen_entry_point`がRust側のCompile処理を呼び出す

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

### compileされた`jit_entry`(`func`)を使って`zjit_entry`に処理を移譲

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

### `rb_zjit_entry`もRust側で初期化される

```rust{*|15,19}
/// Initialize ZJIT at boot. This is called even if ZJIT is disabled.
#[unsafe(no_mangle)]
pub extern "C" fn rb_zjit_init(zjit_enabled: bool) {
    // If --zjit, enable ZJIT immediately
    if zjit_enabled {
        zjit_enable();
    }
}

/// Enable ZJIT compilation.
fn zjit_enable() {
    // ...
    let result = std::panic::catch_unwind(|| {
        // Initialize ZJIT states
        let zjit_entry = ZJITState::init();
        //...
        // ZJIT enabled and initialized successfully
        assert!(unsafe{ rb_zjit_entry == null() });
        unsafe { rb_zjit_entry = zjit_entry; }
    });
    //...
}

```

<Footnotes>
`rb_zjit_init`そのものはRuby起動時に呼び出しされる
</Footnotes>

---
layout: center
---

### `zjit_entry`の中身自体は`gen_entry_trampoline`が生成する生ポインタ

```rust{*|5}
impl ZJITState {
    /// Initialize the ZJIT globals. Return the address of the JIT entry trampoline.
    pub fn init() -> *const u8 {
        // たくさん初期化...
        let entry_trampoline = gen_entry_trampoline(&mut cb).unwrap().raw_ptr(&cb);        
        
        //たくさん初期化...

        entry_trampoline
    }
}
```

---
layout: center
---

### `zjit_entry`経由でJITコンパイルされた関数を呼び出す

<ol>
  <li>1. <code>zjit_entry</code>をCから呼び出すためにCのABIに従ってsetup</li>
  <li>2. 渡されたJITコンパイルされた関数を呼び出す</li>
</ol>


```rust{*|6,13|7-10}{maxHeight: '350px', class:'!children:text-xs'}
/// Compile a shared JIT entry trampoline
pub fn gen_entry_trampoline(cb: &mut CodeBlock) -> Result<CodePtr, CompileError> {
    // Set up registers for CFP, EC, SP, and basic block arguments
    let mut asm = Assembler::new();
    asm.new_block_without_id();
    gen_entry_prologue(&mut asm); // EC/SPなどをZJIT側のレジスタにコピーするなどのセットアップ
    // Jump to the first block using a call instruction. This trampoline is used
    // as rb_zjit_func_t in jit_exec(), which takes (EC, CFP, rb_jit_func_t).
    // So C_ARG_OPNDS[2] is rb_jit_func_t, which is (EC, CFP) -> VALUE.
    asm.ccall_reg(C_ARG_OPNDS[2], VALUE_BITS);
    // Restore registers for CFP, EC, and SP after use
    asm.frame_teardown(lir::JIT_PRESERVED_REGS);
    asm.cret(C_RET_OPND);
    let (code_ptr, gc_offsets) = asm.compile(cb)?;
    // ...
    Ok(code_ptr)
}
```

<Footnotes>
VM -> JITのエントリーポイントを集約することで、EC/SPレジスタ退避などの無駄なコード生成を抑えている
</Footnotes>

---
layout: center
---

## ちょっとずつ見えてきましたね！

もうちょい踏み込んで見てみましょう

---
layout: center
---

### `rb_zjit_iseq_gen_entry_point`がRust側のAPIになっておりコンパイル処理が走る


```rust{*|10}{maxHeight: '350px', class:'!children:text-xs'}
/// CRuby API to compile a given ISEQ.
/// If jit_exception is true, compile JIT code for handling exceptions.
/// See jit_compile_exception() for details.
#[unsafe(no_mangle)]
pub extern "C" fn rb_zjit_iseq_gen_entry_point(iseq: IseqPtr, jit_exception: bool) -> *const u8 {
    // Take a lock to avoid writing to ISEQ in parallel with Ractors.
    // with_vm_lock() does nothing if the program doesn't use Ractors.
    with_vm_lock(src_loc!(), || {
        let cb = ZJITState::get_code_block();
        let mut code_ptr = with_time_stat(compile_time_ns, || gen_iseq_entry_point(cb, iseq, jit_exception));
        // ...
        // Always mark the code region executable if asm.compile() has been used.
        // We need to do this even if code_ptr is None because gen_iseq() may have already used asm.compile().
        cb.mark_all_executable();

        code_ptr.map_or(std::ptr::null(), |ptr| ptr.raw_ptr(cb))
    })
}

```

---
layout: center
---

### `gen_iseq_entry_point`が`compile_iseq`を呼び出す


```rust{*|8}{maxHeight: '350px', class:'!children:text-xs'}
/// Compile an entry point for a given ISEQ
fn gen_iseq_entry_point(cb: &mut CodeBlock, iseq: IseqPtr, jit_exception: bool) -> Result<CodePtr, CompileError> {
    // We don't support exception handlers yet
    if jit_exception {
        return Err(CompileError::ExceptionHandler);
    }
    // Compile ISEQ into High-level IR
    let function = crate::stats::with_time_stat(Counter::compile_hir_time_ns, || compile_iseq(iseq).inspect_err(|_| {
        incr_counter!(failed_iseq_count);
    }))?;
    // Compile the High-level IR
    let IseqCodePtrs { start_ptr, .. } = gen_iseq(cb, iseq, Some(&function)).inspect_err(|err| {
        debug!("{err:?}: gen_iseq failed: {}", iseq_get_location(iseq, 0));
    })?;

    Ok(start_ptr)
}
```

---
layout: center
---

### 順に辿っていくと`compile_iseq` -> `iseq_to_hir`でHIRをコンパイル


```rust{*|4}{maxHeight: '350px', class:'!children:text-xs'}
/// Convert ISEQ into High-level IR
fn compile_iseq(iseq: IseqPtr) -> Result<Function, CompileError> {
    //  ...
    let hir = crate::stats::with_time_stat(Counter::compile_hir_build_time_ns, || iseq_to_hir(iseq));
    let mut function = match hir {
        Ok(function) => function,
        Err(err) => {
            debug!("ZJIT: iseq_to_hir: {err:?}: {}", iseq_get_location(iseq, 0));
            return Err(CompileError::ParseError(err));
        }
    };
    if !get_option!(disable_hir_opt) {
        function.optimize();
    }
    function.dump_hir();
    Ok(function)
}
```

---
layout: center
---

### `iseq_to_hir`でYARVINSNをコンパイル

<ul>
  <li>1. Interpreter/JIT Entry用のBasic Block, 分岐命令に対応したBasic Blockをそれぞれ作る</li>
  <li>2. 作成しておいたBasic Blockに順にYARV INSNをコンパイルしたHIRをBasic Blockに流し込んでいき、それぞれを繋ぐ</li>
</ul>

```rust{*}{maxHeight: '350px', class:'!children:text-xs'}
/// Compile ISEQ into High-level IR
pub fn iseq_to_hir(iseq: *const rb_iseq_t) -> Result<Function, ParseError> {
  // 長すぎるので略...
}
```

<Footnotes>
CFGの枠組みを作る作業と中身を詰めて繋ぐ作業を分離することで、コンパイル処理をやりやすくしている
</Footnotes>


---
layout: default
---

### Basic Block (基本ブロック)

- 分岐や合流を含まない、連続した命令の列 / 入口は先頭の1つだけ、出口は末尾の1つだけ
- Basic Blockをノードとし、分岐をエッジとしたグラフが **CFG（制御フローグラフ）**

<div class="flex gap-6 mt-2 items-start">
<div>

```rb
def fib(n)
  if n <= 1
    1
  else
    fib(n-1) + fib(n-2)
  end
end
```

</div>
<div class="text-lg mt-2">→</div>
<pre class="text-xs !leading-tight !p-3">
┌────────────────────────────────────────────┐
│ bb3(v9:BasicObject, v10:BasicObject):      │
│   v15:Fixnum[1] = Const Value(1)           │
│   v18 = Send v10, :<=, v15                 │
│   v21:CBool = Test v18                     │
│   IfFalse v21, bb4(v9, v10)                │
└──────────┬─────────────────────┬───────────┘
           │true                 │false
           ▼                     ▼
┌────────────────────┐ ┌─────────────────────────────────────┐
│ (return)           │ │ bb4(v32:BasicObject,                │
│   v27:Fixnum[1]    │ │     v33:BasicObject):               │
│    = Const Value(1)│ │   v39:Fixnum[1] = Const Value(1)    │
│   Return v27       │ │   v42 = Send v33, :-, v39           │
└────────────────────┘ │   v44 = Send v32, :fib, v42         │
                       │   v50:Fixnum[2] = Const Value(2)    │
                       │   v53 = Send v33, :-, v50           │
                       │   v55 = Send v32, :fib, v53         │
                       │   v58 = Send v44, :+, v55           │
                       │   Return v58                        │
                       └─────────────────────────────────────┘
</pre>
</div>

<Footnotes>
ZJITではbasic block argumentsを採用しており、ブロック間の値の受け渡しを引数で表現する cf. Phi function<br>
※上の図は説明のための概念図であり実態とは一致しない(ZJITではBBを分岐の片側しか作らない様にしている)
</Footnotes>

---
layout: center
---

### `function.optimize`でHIRレイヤーでの種々の最適化を走らせる（後述）


```rust{*|13}{maxHeight: '350px', class:'!children:text-xs'}
/// Convert ISEQ into High-level IR
fn compile_iseq(iseq: IseqPtr) -> Result<Function, CompileError> {
    //  ...
    let hir = crate::stats::with_time_stat(Counter::compile_hir_build_time_ns, || iseq_to_hir(iseq));
    let mut function = match hir {
        Ok(function) => function,
        Err(err) => {
            debug!("ZJIT: iseq_to_hir: {err:?}: {}", iseq_get_location(iseq, 0));
            return Err(CompileError::ParseError(err));
        }
    };
    if !get_option!(disable_hir_opt) {
        function.optimize();
    }
    function.dump_hir();
    Ok(function)
}
```

---
layout: default
---

### `gen_function`でcompileを進める

<ul>
  <li>1. HIRをLIRに変換</li>
  <li>2. LIRをAssemblyに変換</li>
  <li>3. VM entryとJIT entryの開始アドレスを返す※</li>
</ul>


```rust{*|3-6|7-8|16}{maxHeight: '320px', class:'!children:text-xs'}
fn gen_function(cb: &mut CodeBlock, iseq: IseqPtr, version: IseqVersionRef, function: &Function) -> Result<(IseqCodePtrs, Vec<CodePtr>, Vec<IseqCallRef>), CompileError> {
    // ...
    // Compile each basic block
    for (rpo_idx, &block_id) in reverse_post_order.iter().enumerate() {
        // ... 略
    }
    // Generate code if everything can be compiled
    let result = asm.compile(cb);
    result.map(|(start_ptr, gc_offsets)| {
        // Make sure jit_entry_ptrs can be used as a parallel vector to jit_entry_insns()
        jit.jit_entries.sort_by_key(|jit_entry| jit_entry.borrow().jit_entry_idx);

        let jit_entry_ptrs = jit.jit_entries.iter().map(|jit_entry|
            jit_entry.borrow().start_addr.get().expect("start_addr should have been set by pos_marker in gen_entry_point")
        ).collect();
        (IseqCodePtrs { start_ptr, jit_entry_ptrs }, gc_offsets, jit.iseq_calls)
    })
}
```

<Footnotes>
※VMから入る場合、既にcallee frameがpushされているのに対して、JITtoJIT callは直で飛んでくるので必要な処理が違う
</Footnotes>

---
layout: center
---

### `rb_zjit_iseq_gen_entry_point`がVM entry用のCodePtrを返す


```rust{*|16}{maxHeight: '350px', class:'!children:text-xs'}
/// CRuby API to compile a given ISEQ.
/// If jit_exception is true, compile JIT code for handling exceptions.
/// See jit_compile_exception() for details.
#[unsafe(no_mangle)]
pub extern "C" fn rb_zjit_iseq_gen_entry_point(iseq: IseqPtr, jit_exception: bool) -> *const u8 {
    // Take a lock to avoid writing to ISEQ in parallel with Ractors.
    // with_vm_lock() does nothing if the program doesn't use Ractors.
    with_vm_lock(src_loc!(), || {
        let cb = ZJITState::get_code_block();
        let mut code_ptr = with_time_stat(compile_time_ns, || gen_iseq_entry_point(cb, iseq, jit_exception));
        // ...
        // Always mark the code region executable if asm.compile() has been used.
        // We need to do this even if code_ptr is None because gen_iseq() may have already used asm.compile().
        cb.mark_all_executable();

        code_ptr.map_or(std::ptr::null(), |ptr| ptr.raw_ptr(cb))
    })
}
```

---
layout: center
---

### このCodePtrを`rb_zjit_entry`経由で渡して、<br>`call` or `bl/blr`すれば処理が走るということですね...!!!

---
layout: center
---

## とここまでで超ざっくりですが流れを追った形です

---
layout: center
---

## 大枠が見えたところで最適化の話をしましょう

---
layout: default
---

## 最適化の考え方

<ul class="text-sm">
  <v-click>
    <li class="mb-3"><strong class="text-lg" v-mark.circle.orange="4">命令の実行回数を減らす</strong>
      <ul class="text-xs">
        <li>命令を特殊化する</li>
        <li>一度実行した結果を再利用する</li>
        <li>コンパイル時に実行できるものは実行する</li>
        <li>冗長な命令を削除する</li>
        <li>実行回数を減らす様にプログラムの形を変形する</li>
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

---
layout: center
---

## 命令の特殊化が比較的わかりやすいのでみていきましょう


---
layout: default
---

##  JITからのメソッド呼び出しをする方法はざっくり4つ

<ul>
  <v-click>
    <li class="mb-2"><strong class="text-lg">genericな命令を使う</strong>
      <ul>
        <li>VMの処理をそのまま利用する(Fallback)</li>
        <li><code>Send</code> HIR</li>
      </ul>
    </li>
  </v-click>
  <v-click>
    <li class="mb-2"><strong class="text-lg">C定義関数を直接呼ぶ最適化</strong>
      <ul>
        <li>コンパイル時に対象となる関数を確定・実行時のメソッド探索を省く</li>
        <li><code>CCallWithFrame</code>, <code>CCallVariadic</code>... HIR</li>
        <li>いくつかパターンがある</li>
      </ul>
    </li>
  </v-click>
  <v-click>
    <li class="mb-2"><strong class="text-lg">機械語で直接メモリを操作する</strong>
      <ul>
        <li>C関数呼び出しのセットアップを省く/命令流の切り替えにコストがかかる分岐命令(<code>call</code>,<code>bl/blr</code>)を削除できる</li>
        <li>壊れないようにするための前提/ガードが必要</li>
        <li>※残念ながら常に使えるわけではない</li>
      </ul>
    </li>
  </v-click>
  <v-click>
    <li class="mb-2"><strong class="text-lg">JIT to JIT Call</strong>
      <ul>後述</ul>
    </li>
  </v-click>
</ul>

<Footnotes>
  2026年1月 技術開発全体会より再掲(一部更新)
</Footnotes>


---
layout: default
---

## VMの処理をそのまま利用する(Fallback)

- JIT側で最適化できない場合、VMのdispatch処理をそのまま呼び出す
- メソッド探索・引数セットアップなど全てVM任せ
- まるまるVM Loopを回すので重たいし極力やりたくない

```mermaid {scale: 0.9}
graph LR
    subgraph JIT["JIT code"]
        A["Send v0, :+, v1"]
    end
    subgraph VM["VM"]
        B["method lookup"] --> C["dispatch"] --> D["execute(VM_EXEC)"]
    end
    A -- "call rb_vm_send" --> B
    D -- "return" --> A
```

<Footnotes>
polymorphicなcall siteやprofile情報が不足している場合などにfallbackする
</Footnotes>

---
layout: default
---

## C定義関数を直接呼ぶ最適化1: 汎用CCall

- C定義関数を直接呼ぶパターンその１
- 呼び出し先が確定しているとはいえ、VM frame状態を成立させる必要があるためそこそこ重い
- 内部で他のRubyメソッドを呼ぶ場合など（e.g. `BasicObject#!=`）

```mermaid {scale: 0.9}
graph LR
    subgraph JIT["JIT code"]
        A["frame push"]
    end
    subgraph CF["C function"]
        B["cfunc(argc, argv, recv)"]
    end
    subgraph JIT2["JIT code (後処理)"]
        C["frame pop<br/>SP復元"]
    end
    A --> B --> C
```


---
layout: default
---

## C定義関数を直接呼ぶ最適化2: C ABIに従って直接Call

- Frameを積まない軽量なdirect c call
- calleeの処理がFrameセットアップを必要としない場合などに限って使える
- <code>HashAref</code>等、特定メソッド用のHIR命令

```mermaid {scale: 0.9}
graph LR
    subgraph JIT["JIT code"]
        A["save PC/SP<br/>spill stack/locals"]
    end
    subgraph CF["C function (helper)"]
        B["rb_hash_aref(hash, key)"]
    end
    A --> B
```

<Footnotes>
1と比べてframe push/pop・SP/CFP切替が不要なため軽い<br>
PC/SPなどのspill(VM Stackへの同期)が必要なのは例外/GC発生時に対応するため
</Footnotes>

---
layout: default
---

## 機械語で直接メモリを操作する

- C関数すら呼ばず、機械語レベルで直接メモリを読み書きする
- 関数呼び出しのオーバーヘッドが完全に消える
- それ専用の汎用命令を作っていたりする(e.g. `ArrayAset`)

```mermaid {scale: 0.8}
graph LR
    subgraph JIT["JIT code"]
        A["Guard<br/>(型/frozen/範囲)"] --> B["UnboxFixnum<br/>ArrayLength"] --> C["ArrayAset<br/>直接メモリ書込"]
    end
    A -. "ガード失敗" .-> D["side_exit<br/>→ VMに戻る"]
```

<Footnotes>
全てのガードが通れば関数呼び出しなしで直接メモリ操作 / ガード失敗時はside exitでVMに戻るのでトレードオフ（side exitが多すぎるとNG）
</Footnotes>

---
layout: center
---

## 最初の3つはこんな感じです

---
layout: center
---

## JIT to JIT callが面白いのでじっくりみていく

calleeがISEQの場合、そちらもJITコンパイルできるはずですよね


---
layout: default
---

## JIT to JIT callは<code>SendDirect</code> HIRによって表現される

```rb
def foo(a, b) = a + b
def bar(a, b) = foo(a * 2, b * 3)
bar(2, 3); bar(2, 3)
```

<div class="flex gap-4 mt-2">
<div class="flex-1">

```{*|12}{class:'!children:text-xs', maxHeight:'320px'}
fn bar:
bb3(v11, v12, v13):
  v19:Fixnum[2] = Const Value(2)
  PatchPoint MethodRedefined(Integer, *)
  v41:Fixnum = GuardType v12, Fixnum
  v42:Fixnum = FixnumMult v41, v19
  v25:Fixnum[3] = Const Value(3)
  v45:Fixnum = GuardType v13, Fixnum
  v46:Fixnum = FixnumMult v45, v25
  PatchPoint MethodRedefined(Object, foo)
  v37 = GuardType v11, ObjectSubclass
  v38 = SendDirect v37, :foo, v42, v46
  Return v38
```

</div>
<div class="text-lg mt-24">→</div>
<div class="flex-1">

```{*}{class:'!children:text-xs', maxHeight:'320px'}
fn foo:
bb3(v11, v12, v13):
  PatchPoint MethodRedefined(Integer, +)
  v28:Fixnum = GuardType v12, Fixnum
  v29:Fixnum = GuardType v13, Fixnum
  v30:Fixnum = FixnumAdd v28, v29
  Return v30
```

</div>
</div>

<Footnotes>
barの<code>SendDirect</code>がfooのJITコンパイル済みコードを直接呼び出す / EntryPoint等は省略
</Footnotes>


---
layout: center
---

### `SendDirect`のcodegenはこんな感じ

dummy ptrと思しきものを埋め込んでcall命令を呼んでいそうだね
```rust{*|9|10-14}{maxHeight: '350px', class:'!children:text-xs'}
/// Compile a direct call to an ISEQ method.
/// If `block_handler` is provided, it's used as the specval for the new frame (for forwarding blocks).
/// Otherwise, `VM_BLOCK_HANDLER_NONE` is used.
fn gen_send_iseq_direct(
  //...
) -> lir::Opnd {
    // params setupなど...
    // Set up the new frame
    gen_push_frame(asm, args.len(), state, ControlFrame {...});
    // Make a method call. The target address will be rewritten once compiled.
    let iseq_call = IseqCall::new(iseq, num_optionals_passed);
    let dummy_ptr = cb.get_write_ptr().raw_ptr(cb);
    jit.iseq_calls.push(iseq_call.clone());
    let ret = asm.ccall_with_iseq_call(dummy_ptr, c_args, &iseq_call);
    // side exit処理など... 
    ret
}
```

---
layout: center
---

### 少し遡って`gen_iseq_entry_point`をみる


```rust{*|12}{maxHeight: '350px', class:'!children:text-xs'}
/// Compile an entry point for a given ISEQ
fn gen_iseq_entry_point(cb: &mut CodeBlock, iseq: IseqPtr, jit_exception: bool) -> Result<CodePtr, CompileError> {
    // We don't support exception handlers yet
    if jit_exception {
        return Err(CompileError::ExceptionHandler);
    }
    // Compile ISEQ into High-level IR
    let function = crate::stats::with_time_stat(Counter::compile_hir_time_ns, || compile_iseq(iseq).inspect_err(|_| {
        incr_counter!(failed_iseq_count);
    }))?;
    // Compile the High-level IR
    let IseqCodePtrs { start_ptr, .. } = gen_iseq(cb, iseq, Some(&function)).inspect_err(|err| {
        debug!("{err:?}: gen_iseq failed: {}", iseq_get_location(iseq, 0));
    })?;

    Ok(start_ptr)
}
```

---
layout: center
---

### `gen_iseq_call`なるものをみると、`gen_iseq_call`がおり、


```rust{*|15-18}{maxHeight: '350px', class:'!children:text-xs'}
/// Compile an ISEQ into machine code
fn gen_iseq_body(...) -> Result<IseqCodePtrs, CompileError> {
    // If we ran out of code region, we shouldn't attempt to generate new code.
    if cb.has_dropped_bytes() {
        return Err(CompileError::OutOfMemory);
    }
    // Convert ISEQ into optimized High-level IR if not given
    let function = match function {
        Some(function) => function,
        None => &crate::stats::with_time_stat(Counter::compile_hir_time_ns, || compile_iseq(iseq))?,
    };
    // Compile the High-level IR
    let (iseq_code_ptrs, gc_offsets, iseq_calls) =
        crate::stats::with_time_stat(Counter::compile_lir_time_ns, || gen_function(cb, iseq, version, function))?;
    // Stub callee ISEQs for JIT-to-JIT calls
    for iseq_call in iseq_calls.iter() {
        gen_iseq_call(cb, iseq_call)?;
    }
    // Prepare for GC
    unsafe { version.as_mut() }.outgoing.extend(iseq_calls);
    append_gc_offsets(iseq, version, &gc_offsets);
    Ok(iseq_code_ptrs)
}
```


---
layout: center
---

### `gen_function_stub`とやらをよんでいる


```rust{*|3-4|8-14}{maxHeight: '350px', class:'!children:text-xs'}
/// Stub a branch for a JIT-to-JIT call
pub fn gen_iseq_call(cb: &mut CodeBlock, iseq_call: &IseqCallRef) -> Result<(), CompileError> {
    // Compile a function stub
    let stub_ptr = gen_function_stub(cb, iseq_call.clone()).inspect_err(|err| {
        debug!("{err:?}: gen_function_stub failed: {}", iseq_get_location(iseq_call.iseq.get(), 0));
    })?;

    // Update the JIT-to-JIT call to call the stub
    let stub_addr = stub_ptr.raw_ptr(cb);
    let iseq = iseq_call.iseq.get();
    iseq_call.regenerate(cb, |asm| {
        asm_comment!(asm, "call function stub: {}", iseq_get_location(iseq, 0));
        asm.ccall_into(C_RET_OPND, stub_addr, vec![]);
    });
    Ok(())
}
```

---
layout: center
---

### `gen_function_stub`では、<br>呼び出されると`function_stub_hit_trampoline`に飛ぶようになっている

```rust{*|11}{maxHeight: '350px', class:'!children:text-xs'}
/// Compile a stub for an ISEQ called by SendDirect
fn gen_function_stub(cb: &mut CodeBlock, iseq_call: IseqCallRef) -> Result<CodePtr, CompileError> {
    let (mut asm, scratch_reg) = Assembler::new_with_scratch_reg();
    asm.new_block_without_id("gen_function_stub");
    asm_comment!(asm, "Stub: {}", iseq_get_location(iseq_call.iseq.get(), 0));

    // Call function_stub_hit using the shared trampoline. See `gen_function_stub_hit_trampoline`.
    // Use load_into instead of mov, which is split on arm64, to avoid clobbering ALLOC_REGS.
    asm.load_into(scratch_reg, Opnd::const_ptr(Rc::into_raw(iseq_call)));
    asm.cpush(scratch_reg);
    asm.jmp(ZJITState::get_function_stub_hit_trampoline().into());

    asm.compile(cb).map(|(code_ptr, gc_offsets)| {
        assert_eq!(gc_offsets.len(), 0);
        code_ptr
    })
}
```

---
layout: center
---

### `function_stub_hit_trampoline`は`function_stub_hit`を呼び出す

```rust{*|8-9}{maxHeight: '350px', class:'!children:text-xs'}
/// Generate a trampoline that is used when a function stub is called.
/// See [gen_function_stub] for how it's used.
pub fn gen_function_stub_hit_trampoline(cb: &mut CodeBlock) -> Result<CodePtr, CompileError> {
    let (mut asm, scratch_reg) = Assembler::new_with_scratch_reg();
    asm.new_block_without_id("function_stub_hit_trampoline");
    asm_comment!(asm, "function_stub_hit trampoline");
    // ...
    // Compile the stubbed ISEQ
    let jump_addr = asm_ccall!(asm, function_stub_hit, C_ARG_OPNDS[0], CFP, SP);
    asm.mov(scratch_reg, jump_addr);
    // ...
    // Jump to scratch_reg so that cpop_into() doesn't clobber it
    asm.jmp_opnd(scratch_reg);

    asm.compile(cb).map(|(code_ptr, gc_offsets)| {
        assert_eq!(gc_offsets.len(), 0);
        code_ptr
    })
}
```

---
layout: center
---

### `function_stub_hit`は`function_stub_hit_body`を呼び出して、

```rust{*|13}{maxHeight: '350px', class:'!children:text-xs'}
/// Generated code calls this function with the SysV calling convention. See [gen_function_stub].
/// This function is expected to be called repeatedly when ZJIT fails to compile the stub.
/// We should be able to compile most (if not all) function stubs by side-exiting at unsupported
/// instructions, so this should be used primarily for cb.has_dropped_bytes() situations.
fn function_stub_hit(iseq_call_ptr: *const c_void, cfp: CfpPtr, sp: *mut VALUE) -> *const u8 {
    with_vm_lock(src_loc!(), || {
        // gen_push_frame() doesn't set PC, so we need to set them before exit.
        // function_stub_hit_body() may allocate and call gc_validate_pc(), so we always set PC.
        let iseq_call = unsafe { Rc::from_raw(iseq_call_ptr as *const IseqCall) };
        let iseq = iseq_call.iseq.get();
        // ...
        // Otherwise, attempt to compile the ISEQ. We have to mark_all_executable() beyond this point.
        let code_ptr = with_time_stat(compile_time_ns, || function_stub_hit_body(cb, &iseq_call));
        if code_ptr.is_ok() {
            if let Some(version) = payload.versions.last_mut() {
                unsafe { version.as_mut() }.incoming.push(iseq_call);
            }
        }
        let code_ptr = code_ptr.unwrap_or_else(|compile_error| {
            // We'll use this Rc again, so increment the ref count decremented by from_raw.
            unsafe { Rc::increment_strong_count(iseq_call_ptr as *const IseqCall); }

            prepare_for_exit(iseq, cfp, sp, &compile_error);
            ZJITState::get_exit_trampoline_with_counter()
        });
        cb.mark_all_executable();
        code_ptr.raw_ptr(cb)
    })
}
```

---
layout: default
---

### `function_stub_hit_body`は`gen_iseq`を呼んでCallee ISEQをコンパイル
<ul>
  <li>1. Callee ISEQをコンパイル</li>
  <li>2. stubのcall先をコンパイルしたISEQへのaddressで書き換える</li>
  <li>3. Callee ISEQのentry pointを返す</li>
</ul>

```rust{*|4|12-15}{maxHeight: '350px', class:'!children:text-xs'}
//// Compile an ISEQ for a function stub
fn function_stub_hit_body(cb: &mut CodeBlock, iseq_call: &IseqCallRef) -> Result<CodePtr, CompileError> {
    // Compile the stubbed ISEQ
    let IseqCodePtrs { jit_entry_ptrs, .. } = gen_iseq(cb, iseq_call.iseq.get(), None).inspect_err(|err| {
        debug!("{err:?}: gen_iseq failed: {}", iseq_get_location(iseq_call.iseq.get(), 0));
    })?;

    // Update the stub to call the code pointer
    let jit_entry_ptr = jit_entry_ptrs[iseq_call.jit_entry_idx.to_usize()];
    let code_addr = jit_entry_ptr.raw_ptr(cb);
    let iseq = iseq_call.iseq.get();
    iseq_call.regenerate(cb, |asm| {
        asm_comment!(asm, "call compiled function: {}", iseq_get_location(iseq, 0));
        asm.ccall_into(C_RET_OPND, code_addr, vec![]);
    });

    Ok(jit_entry_ptr)
}
```

---
layout: center
---

### 返却されたentrypointへtrampolineはjumpする

```rust{*|9,10|12-13}{maxHeight: '350px', class:'!children:text-xs'}
/// Generate a trampoline that is used when a function stub is called.
/// See [gen_function_stub] for how it's used.
pub fn gen_function_stub_hit_trampoline(cb: &mut CodeBlock) -> Result<CodePtr, CompileError> {
    let (mut asm, scratch_reg) = Assembler::new_with_scratch_reg();
    asm.new_block_without_id("function_stub_hit_trampoline");
    asm_comment!(asm, "function_stub_hit trampoline");
    // ...
    // Compile the stubbed ISEQ
    let jump_addr = asm_ccall!(asm, function_stub_hit, C_ARG_OPNDS[0], CFP, SP);
    asm.mov(scratch_reg, jump_addr);
    // ...
    // Jump to scratch_reg so that cpop_into() doesn't clobber it
    asm.jmp_opnd(scratch_reg);

    asm.compile(cb).map(|(code_ptr, gc_offsets)| {
        assert_eq!(gc_offsets.len(), 0);
        code_ptr
    })
}
```

---
layout: center
---

## 話をまとめましょう


---
layout: default
---

## JIT to JIT Call: 初回呼び出し

- calleeが未コンパイルなので、stubを経由してその場でコンパイルする
- コンパイル成功後、stub → 本物のJIT entryにパッチされる

```mermaid {scale: 0.6}
flowchart LR
    A["caller callsite<br/>(call stub)"] --> S["stub"]
    S --> T["trampoline"]
    T --> H["function_stub_hit_body<br/>callee ISEQをコンパイル"]
    H --> P["callsiteをパッチ<br/>stub → jit_entry_ptr"]
    H --> J["jit_entry_ptrを返す"]
    J --> T2["trampoline<br/>jmp jit_entry_ptr"]
    T2 --> C["callee JIT code実行"]
    C -- "ret命令でcallsiteへ戻る" --> A
```

<Footnotes>
stubをcallで呼んだ先では、jumpでjit_entry_ptrに入っているので、<br>callee側のretでcaller側に戻ることができる(stackに残っている戻り先を使えば良いだけなので)
</Footnotes>

---
layout: default
---

## JIT to JIT Call: 2回目以降

- 初回でstubがパッチ済みなので、直接callee JIT codeにcallできる

```mermaid {scale: 0.8}
flowchart LR
    A["caller callsite<br/>(patched)"] -->|"direct call"| C["callee JIT code実行"]
```

---
layout: default
---

## 面白いですよね

全部が全部一気にコンパイルするとbootstrapに遅くなってしまう上に、<br>無駄にメモリも食うので可能な限りOn-demand Compilationをしているということなんですね。

似たようなことはJava VM実装の一つであるJikes RVM<span class='text-xs'>※1</span>だったり、VMKit<span class='text-xs'>※2</span>でもやられていたりします


<Footnotes>
※1: <a href="https://www.usenix.org/legacy/event/vm04/tech/full_papers/glew/glew.pdf" target="_blank">Glew, N., Triantafyllis, S., Cierniak, M., Eng, M., Lewis, B. T., & Stichnoth, J. M. (2004).</a><br>
※2: <a href="https://llvm.org/pubs/2010-03-VEE-VMKit.pdf" target="_blank">Geoffray, N., Thomas, G., Lawall, J., Muller, G., & Folliot, B. (2010).</a>
</Footnotes>

---
layout: center
---

## さて、最適化に必要な情報はどこで集めているのでしょうか

メソッド呼び出しを特殊化する際に、Classを決め打つために利用等しているわけですよね

---
layout: center
---

## VM側から必要な情報をJIT側に受け渡す形で実現しています

---
layout: default
---

## 一定の閾値に達すると、Profiling用にYARVの命令列を差し替えます

```c{*|6-10}{maxHeight: '420px', class:'!children:text-base'}
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

---
layout: center
---

```c{*|11|13}{maxHeight: '420px', class:'!children:text-base'}
// Convert a given ISEQ's instructions to zjit_* instructions
void
rb_zjit_profile_enable(const rb_iseq_t *iseq)
{
    // This table encodes an opcode into the instruction's address
    const void *const *insn_table = rb_vm_get_insns_address_table();

    unsigned int insn_idx = 0;
    while (insn_idx < iseq->body->iseq_size) {
        int insn = rb_vm_insn_addr2opcode((void *)iseq->body->iseq_encoded[insn_idx]);
        int zjit_insn = vm_bare_insn_to_zjit_insn(insn);
        if (insn != zjit_insn) {
            iseq->body->iseq_encoded[insn_idx] = (VALUE)insn_table[zjit_insn];
        }
        insn_idx += insn_len(insn);
    }
}
```
---
layout: center
---

```c{*}{class:'!children:text-lg'}
MAYBE_UNUSED(static int vm_bare_insn_to_zjit_insn(int insn));
static int
vm_bare_insn_to_zjit_insn(int insn)
{
    switch (insn) {
      case BIN(send):
        return BIN(zjit_send);
      case BIN(opt_send_without_block):
        return BIN(zjit_opt_send_without_block);
      // ...
    }
}
```

---
layout: center
---

```c{*|5|6}{class:'!children:text-lg'}
/* insn zjit_send(...)(...)(...) */
INSN_ENTRY(zjit_send)
{
    START_OF_ORIGINAL_INSN(zjit_send);
    rb_zjit_profile_insn(BIN(send), ec);
    DISPATCH_ORIGINAL_INSN(send);
    END_INSN(zjit_send);
}
```

---
layout: center
---

```rust{*|5}{class:'!children:text-base'}
/// API called from zjit_* instruction. opcode is the bare (non-zjit_*) instruction.
#[unsafe(no_mangle)]
pub extern "C" fn rb_zjit_profile_insn(bare_opcode: u32, ec: EcPtr) {
    with_vm_lock(src_loc!(), || {
        with_time_stat(profile_time_ns, || profile_insn(bare_opcode as ruby_vminsn_type, ec));
    });
}
```

---
layout: center
---

## という具合にですね

---
layout: center
---

## VMからの情報(class/shape/flag...)を<br>動的に集めている形になっています

ちなみに、コンパイルするタイミングで元のYARV命令列に戻しています

---
layout: center
---

## Profilingの話はそれ自体でそこそこボリュームがあるので<br>今日はこの辺にしておいて、

※またどこかでまとめて話すかもしれません

---
layout: center
---

# 閑話休題

---
layout: center
---

## ここまでの話を聞いて、

---
layout: center
---

## JIT Codeはどこにあって、<br>どうしてそれがRubyのプロセスから実行できるのか

---
layout: center
---

## 気になりますよね


---
layout: default
---

## ZJITの初期化プロセスを追ってみましょう


```rust{*|5-8}{maxHeight: '350px', class:'!children:text-xs'}
impl ZJITState {
    /// Initialize the ZJIT globals. Return the address of the JIT entry trampoline.
    pub fn init() -> *const u8 {
        let mut cb = {
            let mem_block = VirtualMem::alloc(get_option!(exec_mem_bytes), Some(get_option!(mem_bytes)));
            let mem_block = Rc::new(RefCell::new(mem_block));

            CodeBlock::new(mem_block.clone(), get_option_ref!(dump_disasm).is_some())
        };
        // ...
    }
}
```

---
layout: default
---

### `rb_jit_reserve_addr_space`が重要

```rust{*|4}{maxHeight: '400px', class:'!children:text-xs'}
impl VirtualMem {
    /// Allocate a VirtualMem insntace with a requested size
    pub fn alloc(exec_mem_bytes: usize, mem_bytes: Option<usize>) -> Self {
        let virt_block: *mut u8 = unsafe { rb_jit_reserve_addr_space(exec_mem_bytes as u32) };

        // Memory protection syscalls need page-aligned addresses, so check it here. Assuming
        // `virt_block` is page-aligned, `second_half` should be page-aligned as long as the
        // page size in bytes is a power of two 2¹⁹ or smaller. This is because the user
        // requested size is half of mem_option × 2²⁰ as it's in MiB.
        //
        // Basically, we don't support x86-64 2MiB and 1GiB pages. ARMv8 can do up to 64KiB
        // (2¹⁶ bytes) pages, which should be fine. 4KiB pages seem to be the most popular though.
        let page_size = unsafe { rb_jit_get_page_size() };
        assert_eq!(
            virt_block as usize % page_size as usize, 0,
            "Start of virtual address block should be page-aligned",
        );

        Self::new(sys::SystemAllocator {}, page_size, NonNull::new(virt_block).unwrap(), exec_mem_bytes, mem_bytes)
    }
}
```

---
layout: default
---
### `mmap` syscallで一定サイズのアドレスを確保している

<ul>
  <li>default 64MiBで領域を仮想アドレス空間に確保</li>
  <li>最初は権限を<code>PROT_NONE</code>で設定(アクセス権限なし)</li>
  <li>ファイルをマップするわけではないので、MAP形式は<code>ANONYMOUS</code>を利用</li>
</ul>

```c{*|9-16}{class:'!children:text-xs'}
// Address space reservation. Memory pages are mapped on an as needed basis.
// See the Rust mm module for details.
uint8_t *
rb_jit_reserve_addr_space(uint32_t mem_size)
{
    uint8_t *mem_block;
    // On MacOS and other platforms
    // Try to map a chunk of memory as executable
    mem_block = mmap(
        (void *)rb_jit_reserve_addr_space,
        mem_size,
        PROT_NONE,
        MAP_PRIVATE | MAP_ANONYMOUS,
        -1,
        0
    );
    // ...
    return mem_block;
}
```

---
layout: default
---

### 確保後にpage-alignedかどうかをチェックする

確保したページの権限を後述する`mprotect`で都度操作するが、<br>それがページ単位（通常16KiBなど）でしかできないので境界面が揃っているかを念のためチェックする

```rust{*|6-14}{maxHeight: '400px', class:'!children:text-xs'}
impl VirtualMem {
    /// Allocate a VirtualMem insntace with a requested size
    pub fn alloc(exec_mem_bytes: usize, mem_bytes: Option<usize>) -> Self {
        let virt_block: *mut u8 = unsafe { rb_jit_reserve_addr_space(exec_mem_bytes as u32) };

        // Memory protection syscalls need page-aligned addresses, so check it here. Assuming
        // `virt_block` is page-aligned.
        let page_size = unsafe { rb_jit_get_page_size() };
        assert_eq!(
            virt_block as usize % page_size as usize, 0,
            "Start of virtual address block should be page-aligned",
        );

        Self::new(sys::SystemAllocator {}, page_size, NonNull::new(virt_block).unwrap(), exec_mem_bytes, mem_bytes)
    }
}
```


---
layout: default
---

### 確保したページの権限をasmをemitするたびに都度必要に応じて更新していく

```rust{*|6-14}{maxHeight: '400px', class:'!children:text-xs'}
pub fn write_byte(&mut self, write_ptr: CodePtr, byte: u8) -> Result<(), WriteError> {
    let page_size = self.page_size_bytes;
    let raw = write_ptr.raw_ptr(self) as *mut u8;
    let page_addr = (raw as usize / page_size) * page_size;
    if self.current_write_page != Some(page_addr) {
        let start = self.region_start.as_ptr() as usize;
        let mapped_end = start + self.mapped_region_bytes;
        let whole_end = start + self.region_size_bytes;
        let raw_addr = raw as usize;
        if (start..mapped_end).contains(&raw_addr) {
            // 以前使ったページに再度書く。
            // いま RX かもしれないので、この1ページを RW に戻す。
            if !self.allocator.mark_writable(page_addr as *const _, page_size as u32) {
                return Err(FailedPageMapping);
            }
        } else if (mapped_end..whole_end).contains(&raw_addr) {
            // まだ未使用の予約領域に初めて書く。
            // 必要な分のページを新しく RW にする。
            let alloc_size = (page_addr + page_size) - mapped_end;

            if !self.allocator.mark_writable(mapped_end as *const u8, alloc_size as u32) {
                return Err(FailedPageMapping);
            }
            self.mapped_region_bytes += alloc_size;
        } else {
            return Err(OutOfBounds);
        }
        self.current_write_page = Some(page_addr);
    }
    unsafe { raw.write(byte) };
    Ok(())
}

```

<Footnotes>
上記コードは説明のために簡略化・一部改変
</Footnotes>

---
layout: center
---

### `mprotect` syscallで都度ページの権限を更新

大事なのは`W^X`の考え方で、同時にWriteとExecuteが存在しないようにしている

書き込みも実行もできてしまうとセキュリティホールとなりうるからですね
```c
bool
rb_jit_mark_writable(void *mem_block, uint32_t mem_size)
{
    return mprotect(mem_block, mem_size, PROT_READ | PROT_WRITE) == 0;
}
```

<Footnotes>
ref: <a>W^X</a href="https://en.wikipedia.org/wiki/W%5EX">
</Footnotes>

---
layout: default
---

### 故にコンパイル完了時にRXにしている

```rust{*|14}{maxHeight: '350px', class:'!children:text-xs'}
/// CRuby API to compile a given ISEQ.
/// If jit_exception is true, compile JIT code for handling exceptions.
/// See jit_compile_exception() for details.
#[unsafe(no_mangle)]
pub extern "C" fn rb_zjit_iseq_gen_entry_point(iseq: IseqPtr, jit_exception: bool) -> *const u8 {
    // Take a lock to avoid writing to ISEQ in parallel with Ractors.
    // with_vm_lock() does nothing if the program doesn't use Ractors.
    with_vm_lock(src_loc!(), || {
        let cb = ZJITState::get_code_block();
        let mut code_ptr = with_time_stat(compile_time_ns, || gen_iseq_entry_point(cb, iseq, jit_exception));
        // ...
        // Always mark the code region executable if asm.compile() has been used.
        // We need to do this even if code_ptr is None because gen_iseq() may have already used asm.compile().
        cb.mark_all_executable();

        code_ptr.map_or(std::ptr::null(), |ptr| ptr.raw_ptr(cb))
    })
}
```

---
layout: default
---

### また明示的にCPUの命令キャッシュ(`i-cache`)をクリアする

L1/L2キャッシュの話ですね。

armの場合は明示的にclearが必要

```c
// Invalidate icache for arm64.
// `start` is inclusive and `end` is exclusive.
void
rb_jit_icache_invalidate(void *start, void *end)
{
    // Clear/invalidate the instruction cache. Compiles to nothing on x86_64
    // but required on ARM before running freshly written code.
    // On Darwin it's the same as calling sys_icache_invalidate().
#ifdef __GNUC__
    __builtin___clear_cache(start, end);
#elif defined(__aarch64__)
#error No instruction cache clear available with this compiler on Aarch64!
#endif
}
```

---
layout: default
---

### ここまでの流れをまとめると原理的には↓と同じ

```c{*}{maxHeight: '450px', class:'!children:text-xs'}
#include <sys/mman.h>
#include <string.h>
#include <stdio.h>
#include <unistd.h>

int main(void) {
    unsigned char code[] = {
        0x60, 0x00, 0x80, 0x52, // mov w0, #3
        0xc0, 0x03, 0x5f, 0xd6  // ret
    };
    size_t pagesize = (size_t)sysconf(_SC_PAGESIZE);
    void *buf = mmap(NULL, pagesize, PROT_READ | PROT_WRITE,
                     MAP_PRIVATE | MAP_ANON, -1, 0);
    if (buf == MAP_FAILED) return 1;
    memcpy(buf, code, sizeof(code));
    __builtin___clear_cache((char *)buf, (char *)buf + sizeof(code));

    if (mprotect(buf, pagesize, PROT_READ | PROT_EXEC) != 0) return 1;

    int (*fn)(void) = (int (*)(void))buf;
    printf("%d\n", fn()); // 3
    return 0;
}
```

---
layout: center
---

# また一歩理解できた気がしますね！

---
layout: center
---

# ちょっと議論のレイヤーを(H)IRに戻しましょう

---
layout: center
---

## ZJITではYJITからアーキテクチャを変更することで、<br>種々の恩恵を得られるようになったわけですが、

---
layout: center
---

## いくつかの特徴を見ていきましょう

---
layout: default
---

### SSA (Static Single Assignment, 静的単一代入)

- 全ての変数が**一度だけ定義**される中間表現の形式
- 変数の性質を単純にすることで、様々なコンパイラ最適化を簡略化し改善できる

<div class="flex mt-4 items-start">
<div class="w-5/12">
<pre class="!p-4 text-sm !leading-relaxed">y := 1
y := 2
x := y</pre>
<p class="text-sm mt-2"><code>x</code> が使う <code>y</code> はどちらの定義に起因するかを<br>判定するためには別途解析が必要</p>
</div>
<v-click>
<div class="text-lg mt-6 mx-4">→</div>
<div class="w-5/12">
<pre class="!p-4 text-sm !leading-relaxed">y1 := 1
y2 := 2
x1 := y2</pre>
<p class="text-sm mt-2"><code>x1</code> は <code>y2</code> を使う / <code>y1</code> は未使用であることがわかる<br>→ <strong>不要コード除去も自明</strong></p>
</div>
</v-click>
</div>

<v-click>

- LLVM IR, Go(SSA backend), Rust(MIR), Swift(SIL)など多くのコンパイラで採用されている

</v-click>

---
layout: center
---

## 実際に行われているいくつかの最適化手法をみていきましょう

---
layout: default
---

### ZJITの最適化パイプライン

<ol class='text-base'>
  <li><code>type_specialize</code> - 型情報に基づく命令の特殊化</li>
  <li><code>inline</code> - インライン展開</li>
  <li><code>optimize_getivar</code> - インスタンス変数アクセスの最適化</li>
  <li><code>optimize_c_calls</code> - C関数呼び出しの最適化</li>
  <li><code>optimize_load_store</code> - ロード/ストアの最適化</li>
  <li><strong><code>fold_constants</code> - 定数畳み込み</strong></li>
  <li><strong><code>clean_cfg</code> - CFGの簡略化</strong></li>
  <li><code>remove_redundant_patch_points</code> - 重複PatchPointの除去</li>
  <li><code>remove_duplicate_check_interrupts</code> - 重複割り込みチェックの除去</li>
  <li><strong><code>eliminate_dead_code</code> - 不要コード除去</strong></li>
</ol>

<Footnotes>
太字の3つをこの後みていきます
</Footnotes>

---
layout: default
---

### Constant Folding (定数畳み込み)

- コンパイル時にオペランドが定数であれば、**実行前に計算を済ませる**
- 結果を `Const` 命令に置き換えて、実行時の計算を削除

<div class="flex justify-center gap-8 mt-2 items-start">
<v-click>
<div>

```rb
def test
  1 + 2 + 3
end
```

```{*}{class:'!children:text-xs'}
bb3():
  v10:Fixnum[1] = Const Value(1)
  v12:Fixnum[2] = Const Value(2)
  PatchPoint MethodRedefined(Integer, +)
  v20:Fixnum = FixnumAdd v10, v12
  v16:Fixnum[3] = Const Value(3)
  v24:Fixnum = FixnumAdd v20, v16
  Return v24
```

</div>
</v-click>
<v-click>
<div class="text-lg mt-12">→</div>
</v-click>
<v-click>
<div>

```{*}{class:'!children:text-xs'}
bb3():
  v10:Fixnum[1] = Const Value(1)
  v12:Fixnum[2] = Const Value(2)
  PatchPoint MethodRedefined(Integer, +)
  v33:Fixnum[6] = Const Value(6)
  CheckInterrupts
  Return v33
```

`1+2+3` がコンパイル時に `6` に畳み込まれる<br>
元のConstはDCE(後段)で除去される

</div>
</v-click>
</div>

<Footnotes>
FixnumAdd/Sub/Mult/Div等の算術演算、比較演算、GuardType、frozen objectのフィールドアクセスなどが対象<br>
overflow検査付き(<code>checked_add</code>等)で安全に畳み込む
</Footnotes>

---
layout: default
---

### Constant Folding: 分岐の除去

- 条件が定数と分かれば、**分岐自体を消せる**
- 常にtrue → `IfTrue` を除去(fallthrough) / 常にfalse → `IfTrue` を `Jump` に変換

<div class="flex justify-center gap-8 mt-2 items-start">
<v-click>
<div>

```rb
def test
  cond = true
  if cond
    3
  else
    4
  end
end
```

```{*}{class:'!children:text-xs'}
bb3(v8, v9):
  v13:TrueClass = Const Value(true)
  v19:CBool[true] = Test v13
  IfFalse v19, bb4(v8, v20)
  v25:Fixnum[3] = Const Value(3)
  Return v25
bb4(v30, v31):
  v35 = Const Value(4)
  Return v35
```

</div>
</v-click>
<v-click>
<div class="text-lg mt-16">→</div>
<div>

```{*}{class:'!children:text-xs'}
bb3(v8, v9):
  v13:TrueClass = Const Value(true)
  CheckInterrupts
  v25:Fixnum[3] = Const Value(3)
  Return v25
```

- `Test`/`IfFalse` が除去、true側に直行
- bb4は到達不能になり除去
- 分岐命令がゼロに

</div>
</v-click>
</div>

<Footnotes>
逆に条件が常にfalseなら<code>IfTrue</code>自体をdropし、fallthroughのみ残す
</Footnotes>


---
layout: default
---

### Clean CFG (制御フローグラフの簡略化)

- Jumpで繋がるだけのブロックを**1つに結合**する
- 条件: Jump先のブロックへの入口が1つだけであること

<div class="flex justify-center gap-8 mt-2 items-start">
<v-click>
<div>

<pre class="text-xs !leading-tight !px-6 !py-3">
┌──────────────────────┐
│ bb0():               │
│   v0 = ...           │
│   Jump bb1(v0)       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ bb1(v1):             │
│   v2 = FixnumAdd v1  │
│   Return v2          │
└──────────────────────┘
</pre>

bb1への入口はbb0からの1つだけ

</div>
</v-click>
<v-click>
<div class="text-lg mt-12">→</div>
<div>

<pre class="text-xs !leading-tight !px-6 !py-3">
┌──────────────────────┐
│ bb0():               │
│   v0 = ...           │
│   v2 = FixnumAdd v0  │
│   Return v2          │
└──────────────────────┘
</pre>

- Jumpが消え、bb1の命令がbb0に吸収
- bb1のパラメータ `v1` は `v0` に統合
- CFGがフラットになり後段の最適化が効きやすくなる

</div>
</v-click>
</div>

<Footnotes>
入口が複数あるブロック(= linearでない)は結合できない
</Footnotes>

---
layout: default
---

### Dead Code Elimination (不要コード除去)

- **使われていない命令**をコンパイル時に除去する
- 副作用のない命令のみが除去対象（副作用 = Memory/Control/Stack等への書き込みなど）

<div class="flex justify-center gap-8 mt-2 items-start">
<v-click>
<div>

```rb
def test(a, b)
  a + b  # 結果を使っていない
  5
end
```

```{*}{class:'!children:text-xs'}
bb3(v11, v12, v13):
  PatchPoint MethodRedefined(Integer, +)
  v32:Fixnum = GuardType v12, Fixnum
  v33:Fixnum = GuardType v13, Fixnum
  v34:Fixnum = FixnumAdd v32, v33
  v24:Fixnum[5] = Const Value(5)
  Return v24
```

</div>
</v-click>
<v-click>
<div class="text-lg mt-12">→</div>
<div>

```{*}{class:'!children:text-xs'}
bb3(v11, v12, v13):
  PatchPoint MethodRedefined(Integer, +)
  v32:Fixnum = GuardType v12, Fixnum
  v33:Fixnum = GuardType v13, Fixnum
  v24:Fixnum[5] = Const Value(5)
  Return v24
```

`FixnumAdd` は副作用なし & 結果未使用 → 除去

</div>
</v-click>
</div>

<Footnotes>
副作用自体はEffect systemとして内部で命令ごとに分類がされている。その話はまた今度...

SSAであるからこそ、def-useが明確なので、全ての代入を追う必要がなく、それぞれの命令のoperandをみるだけで削除ができる。
</Footnotes>


---
layout: default
---

## まだまだやれる余地はあります

- Common Subexpression Elimination(共通部分式の削除(CSE), LVN)
- Global Value Numbering(GVN)
- ISEQ呼び出しのInline化
- 演算の強度低減
- Sparse conditional constant propagation
- ... and more!!


---
layout: center
---

## めちゃくちゃ面白くないですか

---
layout: center
---

# 今日の内容としては以上ですが、

---
layout: center
---

# RubyKaigi 2026でも面白いセッションが目白押し

---
layout: center
---

<div class='flex justify-center' >
  <img src='/public/rubykaigi2026-talk-1.png' class='w-3/4'/>
</div>

---
layout: center
---

<div class='flex justify-center' >
  <img src='/public/rubykaigi2026-talk-2.png' class='w-3/4'/>
</div>


---
layout: center
---

## みんなさんの挑戦を期待します！


---
layout: center
---

## おわり！！🎉
