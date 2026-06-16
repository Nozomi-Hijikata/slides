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

- ZJITはProfileをためてその情報を元に最適化をする
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

## Profileを元に、そのパスの最適化度合いを決める

- TODO: DefinedIvarの例, Ruby code, HIR Code
- 時間の都合上細かい話はしないが、とにかく早くなっていると思ってください

<!--時間の都合的にもうちょい説明を差し込めるかも？-->

---
layout: center
---

## これで高速なパスに落とし込むことができました

※GuardXXXなどで前提条件を担保している

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

### JIT側ではハンドリングできないので、<br>操作の意味を保つためにも、<br>VMに戻す必要がある

---
layout: center
---

## Side exit

他の処理系だとdeopt(de-optimization)とか言ったりします

---
layout: center
---

## 当然の用にSide exitはやりたくない
JIT側での処理を増やせば増やすほど早くなる（逆も然り）

---
layout: center
---

# ではどうするか
