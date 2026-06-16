---
theme: geist
colorSchema: light

layout: center

drawings:
  persist: false

transition: slide-left

mdc: true
---

# ZJITでの最適化: Recompile編

wakate.rb #7 LT

2026/06/22

---
layout: default
---

# 自己紹介

- Nozomi Hijikata (@nozomemein)

<v-click>

### プロフィール
- 株式会社Techouseでエンジニアをしています
- Ruby/Rails書いたり、Rust書いたり、モバイルアプリやったり、インフラやったり...
- 24卒 / 1児のパパ

</v-click>

<v-click>

### 好きなもの
- Compiler / 最適化
- 勉強

</v-click>

---
layout: center
---

# 今日のテーマは

---
layout: center
---

<h1 class="text-8xl">ZJIT</h1>

---
layout: center
---

# 軽くおさらい

---
layout: center
---

<div class='flex justify-center' >
  <img src='/public/zjit-enhanced.png' class='w-full'/>
</div>

---
layout: center
---

## 今日はZJITで導入されているRecompileについて話します

---
layout: default
---

## 前提

- ZJITはProfileをためてその情報を元に最適化をする（e.g. より早い処理で置き換えたり、結果をたたみ込んだり）
- VM側からYARVの命令列をProfile用に一時的に差し替える形でプロファイルをする

```c{*|11|13}{maxHeight: '320px', class:'!children:text-xs'}
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
layout: default
---

## 集めたProfileを元にそのパスの最適化度合いを決める

```rb
@foo = 4
def test = defined?(@foo)
test;test
```

<v-click at="1">
<div class="flex gap-4 mt-2">
<div class="flex-1">

```text{*|12}{at:2, class:'!children:text-xs', maxHeight:'320px'}
Initial HIR:
fn test@../test.rb:2:
bb1():
  EntryPoint interpreter
  v1:BasicObject = LoadSelf
  Jump bb3(v1)
bb2():
  EntryPoint JIT(0)
  v4:BasicObject = LoadArg :self@0
  Jump bb3(v4)
bb3(v6:BasicObject):
  v10:StringExact|NilClass = DefinedIvar v6, :@foo
  CheckInterrupts
  Return v10
```

</div>
<div class="text-lg mt-24">→</div>
<div class="flex-1">

```text{*|11-15}{at:3, class:'!children:text-xs', maxHeight:'320px'}
Optimized HIR:
fn test@../test.rb:2:
bb1():
  EntryPoint interpreter
  v1:BasicObject = LoadSelf
  Jump bb3(v1)
bb2():
  EntryPoint JIT(0)
  v4:BasicObject = LoadArg :self@0
  Jump bb3(v4)
bb3(v6:BasicObject):
  v16:HeapBasicObject = GuardType v6, HeapBasicObject
  v17:CShape = LoadField v16, :shape_id@0x4
  v18:CShape[0x80008] = GuardBitEquals v17, CShape(0x80008) recompile
  v19:StringExact[VALUE(0x103ba9440)] = Const Value(VALUE(0x103ba9440))
  CheckInterrupts
  Return v19
```

</div>
</div>

</v-click>

<v-click at="4">
<Footnotes>
論点から逸れるのでここでは最適化の中身自体は触れませんが、Compile時の情報を元に結果を畳み込んでいると思ってください
</Footnotes>
</v-click>


---
layout: center
---

## これでProfleをもとに、<br>高速なパスに落とし込むことができました

---
layout: center
---

## めでたしめでたし

---
layout: center
---

## 本当に、、？

---
layout: center
---

## もし仮に前提条件を壊すパターンがくるとどうなる？

---
layout: center
---

## JIT側ではハンドリングできないので、<br>操作の意味を保つためにも、<br>VMに戻す必要がある

---
layout: center
---

## Side Exit

他の処理系だとdeopt(de-optimization)とか言ったりします

---
layout: center
---

## 当然の用にSide Exitはやりたくない
JIT側での処理を増やせば増やすほど早くなる（逆も然り）

---
layout: center
---

# ではどうするか

---
layout: center
---

# プロファイルをやりなおしたらいいじゃないか

---
layout: center
---

# Recompile

---
layout: center
---

# Profileを新しく取り直す
Profileがないケースや、漏れているケースのカバーができるようになる

---
layout: center
---

TODO: Recompileのimageを書いておく
実装サンプルまではなくてもいい気がするが、HIRでdiffをとりたい
