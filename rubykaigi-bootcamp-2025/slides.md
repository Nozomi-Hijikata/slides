---
theme: geist
colorSchema: light

layout: center

drawings:
  persist: false

# slide transition: https://sli.dev/guide/animations.html#slide-transitions
transition: slide-left

# enable MDC Syntax: https://sli.dev/features/mdc
mdc: true
---

# RubyKaigi 2025 予習Bootcamp

2025/03/07 MS芝浦ビル

---
layout: center
---

# おはようございます！！



---
layout: center
---

# 今日はRubyについてとことん学んでもらいます

---
layout: center
---

# なぜか

---
title: rubykaigi ogp
layout: image
image: rubykaigi-ogp.jpg
---


---
layout: center
---

# Ruby のことを知らないと、<br/>RubyKaigiは楽しめない

---
class: text-center
---

## TODO: Rubyの図を貼る



---
layout: center
---

# RubyKaigiを全力で楽しみ・実りある会にする


---
layout: default
---

# 今日のお品書き
## 午前の部
<p class="text-2xl text-black">Rubyの言語処理系について全体像を把握してもらいます</p>
<ul class="text-xl">
  <li>プログラミング言語処理系の前提知識</li>
  <li>Rubyの言語処理系におけるプロセスの全体像</li>
</ul>

## 午後の部
<p class="text-2xl text-black">より各論的な内容にDeepDiveしていきます</p>
<ul class="text-xl">
  <li>Parser周り: Prism, Lrama...</li>
  <li>並行・並列処理: スレッド/プロセス, 排他処理, イベント駆動, Fiber, Ractor...</li>
  <li>JITコンパイラの動向: RJIT, YJIT, LBBV, ...</li>
</ul>


---
layout: center
---

# さてさて、


---
layout: center
---

# ruby -e "puts 7 + 8"
<p class="text-xl">このコードを適当なターミナルエミュレータから実行すると...</p>


---
layout: center
---

# 15 <span class="text-xl">ですよね</span>


---
layout: center
---

<h1 class="font-bold text-2xl text-black"> でも、<strong class="text-4xl text-black">なぜ？</strong></h1>


---
layout: image-left
image: NikoTinbergen.jpg
---

## <span class="text-xl">そもそも</span>なぜ？<span class="text-xl">を考える上では、</span>
## ティンバーゲンの4つの問い <br/><span class="text-xl">で整理できる</span>

---
layout: center
---

# ティンバーゲンの4つの問い

||<span class="font-bold">静的</span>|<span class="font-bold">動的</span>|
|-|---|----|
|至近要因|メカニズムとしてのなぜ|適応としてのなぜ|
|究極要因|発生|進化|


---
layout: two-cols-header
---

# シジュウカラは春になぜ鳴くのか？

::left::
## 1. 原因（メカニズム）
- その行動を引き起こしている直接の原因は何か？
- （例）季節の変化をどのようにして知るのか？どのようなホルモンが歌生成を促すのか？

## 2. 適応（機能）
- その行動は、どんな機能があるから進化してきたのか？
- （例）歌は、なわばりの維持や配偶獲得という点で、繁殖成功率をどの程度上昇させるか？

::right::

## 3. 個体発生
- その行動は、一生の間にどのような発達の経路をたどって完成するのか？
- （例）ヒナから成長してくる間に、鳴き声はどのようにして歌に変わるのか？

## 4. 系統発生
- その行動は、祖先からどういう道筋をたどって出現したのか？
- （例）祖先の鳥からの系統において、歌の能力やパターンはどのように変化したのか？



---
layout: center
---

# <span class="text-xl">今日のBootcampでは</span>メカニズムとしてのなぜ<span class="text-xl">を突き詰めていきます</span>

<p class="text-2xl text-black">そしてその過程でRubyというソフトウェアが<br/>どのように発達/進化(<strong>Develop</strong>)してきたのかの一端を垣間見てほしいです</p>
