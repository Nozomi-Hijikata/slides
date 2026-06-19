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

<v-click at="1">
<div>

```c{*|11|13}{at:2, maxHeight: '320px', class:'!children:text-xs'}
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

</div>
</v-click>


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

```text{*|12-15}{at:3, class:'!children:text-xs', maxHeight:'320px'}
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
  v18:CShape[0x80008] = GuardBitEquals v17, CShape(0x80008)
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

## これでProfileをもとに、<br>高速なパスに落とし込むことができました

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

```text{*|14}{class:'!children:text-xs', maxHeight:'320px'}
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
  v18:CShape[0x80008] = GuardBitEquals v17, CShape(0x80008)
  v19:StringExact[VALUE(0x103ba9440)] = Const Value(VALUE(0x103ba9440))
  CheckInterrupts
  Return v19
```

---
layout: center
---

## JIT側ではハンドリングできないので、VMに戻す


---
layout: center
---

## Side Exit

JITでハンドリングできない場合※に、VMに処理を戻す

他の処理系だとdeopt(de-optimization)とか言ったりします

<Footnotes>
※そもそもJITでハンドリングできない理由はまちまち<br>（Profileとは違う条件での実行、未対応のバイトコード、メソッド再定義、割り込み...）
</Footnotes>

---
layout: center
---

## 当然のようにSide Exitはやりたくない
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

# Profileを新しく取り直して、Compileをやり直す
1. Side ExitするたびにProfileをとって、カウンタが閾値になるまで待つ
2. 古いISEQを無効化し、ISEQ単位でCompileをやり直す

Profileがないケースや、漏れているケースのカバーができるようになる

<Footnotes>
※もうちょい細かく分岐があるんですが、ざっくり書くとこんな感じです
</Footnotes>

---
layout: default
---

## 具体的な例で考えてみる

```rb{*|2}
class C
  def test = defined?(@a)
end
obj = C.new
obj.instance_variable_set(:@a, 1)
50.times { obj.test } # @a存在化でprofile
```

<v-click>
```text{*}{class:'!children:text-xs', maxHeight:'280px'}
bb1():
  EntryPoint interpreter
  v1:HeapBasicObject = LoadSelf
  Jump bb3(v1)
bb2():
  EntryPoint JIT(0)
  v4:HeapBasicObject = LoadArg :self@0
  Jump bb3(v4)
bb3(v6:HeapBasicObject):
  v17:CShape = LoadField v6, :shape_id@0x4
  v18:CShape[0x80008] = GuardBitEquals v17, CShape(0x80008)
  v19:StringExact[VALUE(0x1017194d0)] = Const Value(VALUE(0x1017194d0))
  CheckInterrupts
  Return v19
```
</v-click>

<v-click>
<Footnotes>
このような単一ProfileしかないパスをMonomorphicと言ったりします
</Footnotes>
</v-click>

---
layout: default
---

## 具体的な例で考えてみる2

```rb{*|8-10}
class C
  def test = defined?(@a)
end
obj = C.new
obj.instance_variable_set(:@a, 1)
50.times { obj.test } # @a存在化でprofile

obj = C.new
obj.instance_variable_set(:@b, 1) # @bしか持たないインスタンス
50.times { obj.test } # bはcompileされたJITコードに存在しないので、Side Exit...!!
```

```text{*|3}{class:'!children:text-xs', maxHeight:'320px'}
bb3(v6:HeapBasicObject):
  v17:CShape = LoadField v6, :shape_id@0x4
  v18:CShape[0x80008] = GuardBitEquals v17, CShape(0x80008) # ここでSide Exitする
  v19:StringExact[VALUE(0x1017194d0)] = Const Value(VALUE(0x1017194d0))
  CheckInterrupts
  Return v19
```

---
layout: center
---

## Recompileすると、、、

---
layout: default
---

## 具体的な例で考えてみる3

```text{*|2-4|5|6-8|5|9-13|14-16|13|17-19|20-22}{class:'!children:text-xs', maxHeight:'420px'}
bb3(v6:HeapBasicObject):
  v12:CShape = LoadField v6, :shape_id@0x4
  v13:CShape[0x80009] = Const CShape(0x80009)
  v14:CBool = IsBitEqual v12, v13
  CondBranch v14, bb5(), bb6()
bb5():
  v16:NilClass = Const Value(nil) # @bだけのパス
  Jump bb4(v16)
bb6():
  v18:CShape = LoadField v6, :shape_id@0x4
  v19:CShape[0x80008] = Const CShape(0x80008)
  v20:CBool = IsBitEqual v18, v19
  CondBranch v20, bb7(), bb8()
bb7():
  v22:StringExact[VALUE(0x1017194d0)] = Const Value(VALUE(0x1017194d0))
  Jump bb4(v22)
bb8():
  v24:StringExact|NilClass = DefinedIvar v6, :@a # Fallbackの汎用パス
  Jump bb4(v24)
bb4(v11:StringExact|NilClass):
  CheckInterrupts
  Return v11
```

---
layout: center
---

# いい感じですね

---
layout: center
---

##  実際にこの理屈でRecompile基盤※を使って

<Footnotes>
※Recompile基盤は k0kubunさんが既に整備してくれていたので、そちらを活用する形をとっています🙏
</Footnotes>

---
layout: center
---

## Side Exitをいくらか減らすことができた！！🎉

<div class='flex justify-center' >
  <img src='/public/zjit-recompile-stats.png' class='w-full'/>
</div>

<Footnotes>
ref: https://github.com/ruby/ruby/pull/16881
</Footnotes>

---
layout: center
---

# 時間の都合でだいぶ駆け足&端折っていますが

---
layout: center
---

# とっても面白くないですか？

他にももっと面白いテーマがたくさんある...!!!

---
layout: center
---

# ZJITに少しでも興味を持ってくれたら嬉しいです

---
layout: center
---

<div class='flex flex-col justify-center items-center' >
  <h3>自分も隙間を見てコツコツ改善をしていたりします</h3>
  <img src='/public/zjit-prs.png' class='w-1/2'/>
</div>
