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
layout: center
---

<div class='flex justify-center' >
  <img src='./public/ruby-intro.png' class='w-3/4'/>
</div>


---
layout: center
---

# RubyKaigiを全力で楽しみ・実りある会にする

<p class='text-2xl'>そして、そのためには皆さんが主体的に取り組む必要があります</p>

---
layout: center
---

# 熱くてワクワクするような1日にしていきましょう！！💪


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
layout: cover
---

<div class='flex flex-row gap-4 justify-center'>
  <img src='./public/NikoTinbergen.jpg' class='w-1/4'/>
  <h2 class='m-auto mx-0'> 
    なぜ？<span class="text-xl">を考える上では、</span><br/>
    ティンバーゲンの4つの問い<span class="text-xl">で整理できる</span>
  </h2>
</div>

---
layout: default
---

# ティンバーゲンの4つの問い

||<span class="font-bold">静的</span>|<span class="font-bold">動的</span>|
|-|---|----|
|至近要因|<span class="font-bold">メカニズムとしてのなぜ</span>|<span class="font-bold">適応としてとしてのなぜ</span>|
|究極要因|<span class="font-bold">発生</span>|<span class="font-bold">進化</span>|


---
layout: default
---

<div class="flex flex-row">
  <h1>例:シジュウカラは春になぜ鳴くのか？</h1>
  <img src='/public/sijukara.jpeg' class='w-1/5 pt-4'/>
</div>

||<span class="font-bold">静的</span>|<span class="font-bold">動的</span>|
|-|---|----|
|至近要因|<span class="font-bold">メカニズムとしてのなぜ:</span><br/><span class="text-xl">季節の変化をどのようにして知るのか？どのようなホルモンが歌生成を促すのか？</span>|<span class="font-bold">適応としてのなぜ</span>:<br/><span class="text-xl">歌は、なわばりの維持や配偶獲得という点で、繁殖成功率をどの程度上昇させるか？</span>|
|究極要因|<span class="font-bold">発生:</span><br/><span class="text-xl"> ヒナから成長してくる間に、鳴き声はどのようにして歌に変わるのか？</span>|<span class="font-bold">進化:</span><br/><span class="text-xl"> 祖先の鳥からの系統において、歌の能力やパターンはどのように変化したのか？</span>|


---
layout: center
---

<h1 class='!mb-4'><span class="text-xl">今日のBootcampでは </span>Rubyのメカニズムとしてのなぜ<span class="text-xl"> を突き詰めていきます</span></h1>

<p class="text-2xl text-black">そしてその過程でRubyというソフトウェアが<br/>どのように発達/進化(<strong>Develop</strong>)してきたのかの一端を垣間見てほしいです</p>



---
layout: center
---

# 「プログラムを実行する」ということについて考えてみます

---
layout: center
---

<div class='px-8'>
  <h1>プログラムを実行するには処理系が必要ですね</h1>
  <p class='text-2xl'>言語仕様と処理系は分けなければいけない。Rubyのソースが動かせるからといって、他の人との処理系と同じかと言われると異なる</p>
</div>



---
layout: default
---

# Rubyの言語処理系について
<h2> <span  v-mark.circle.orange>CRuby (MRI)</span></h2>
<p class='text-xl'>
Matzが作ったRuby, 所謂Ruby
MRI (Matz' Ruby Implementation)
</p>


## JRuby
<p class='text-xl'>
Java言語で実装されたRubyの処理系。
RubyのコードをクロスプラットフォームであるJVM（Java Virtual Machine）上で実行でき、Rubyで実装されたコード上でJavaのライブラリが利用可能である。インタプリタ・実行時コンパイラ・事前コンパイラ の3種類が用意されている。
</p>

[他にもたくさん](https://www.ruby.or.jp/ja/tech/install/ruby/implementations)


---
layout: default
---
# インタプリタ型言語の基本

<p class='text-xl'>
ランタイムで逐次的にソースを解釈して実行するインタプリタ言語では、<br/>基本的には下記のような流れをとります
</p>
<div class='w-full flex justify-center mt-16'>
```mermaid {scale: 1.0}
graph LR
    A[ソースコード] -->|字句解析| B[トークン列]
    B -->|構文解析| C[構文木（AST）]
    C -->|実行| D[実行結果]
```
</div>

<v-click>
<p class='text-2xl font-bold text-center'>
この流れが基本中の基本なので覚えましょう！
</p>
</v-click>


---
layout: default
---
# 参考）コンパイル型言語だと？

<p class='text-xl'>
事前にコンパイルされるコンパイル型言語（AOT、Ahead of Timeとか言ったりします）だと<br/>下記のような作り方をします
</p>
<div class='w-full flex justify-center'>
```mermaid {scale: 0.8}
graph LR
  A[ソースコード<br/>sample.c] -->|コンパイラ| B[オブジェクトファイル<br/>sample.o]
  B -->|リンカ| C[実行可能なプログラム<br/>a.out]
  C -->|ロード| D[プロセスとして実行]
```
</div>

<p class='text-xl'>
実際には、近年だと<a href='https://llvm.org/' target='_blank'>LLVM</a>と呼ばれる基盤の上で、最適化に最適化を重ねているのでもっと複雑です<br/>
作る側はLLVMに合わせて中間表現を吐き出せばいいので、クロスプラットフォーム対応しやすいメリットがあります
</p>
<div class='w-full flex justify-center'>
  <img src='./public/LLVM.png' class='w-3/5'/>
</div>


---
layout: default
---
# CRubyも同じ流れをとります

<p class='text-xl'>
<span v-mark.underline.red>Ruby1.8まで:</span> 基本はさっきの内容と<strong>同じ</strong>
</p>
<div class='w-full flex justify-center mt-16'>
```mermaid {scale: 1.0}
graph LR
    A[ソースコード] -->|字句解析| B[トークン列]
    B -->|構文解析| C[構文木（AST）]
    C -->|実行| D[実行結果]
```
</div>



---
layout: default
---
# CRubyも同じ流れをとります(2回目)

<!-- VMの紹介 -->

<p class='text-xl'>
<span>Ruby1.8まで:</span> 基本はさっきの内容と<strong>同じ</strong>
</p>
<div class='w-full flex justify-center mt-16'>
```mermaid {scale: 1.0}
graph LR
    A[ソースコード] -->|字句解析| B[トークン列]
    B -->|構文解析| C[構文木（AST）]
    C -->|実行| D[実行結果]
```
</div>

<v-click>
<p class='text-xl'>
Ruby 1.9(2007-12-25リリース)以降: VMが追加された
</p>
<div class='w-full flex justify-center mt-16'>
```mermaid {scale: 0.7}
graph LR
    A[ソースコード] -->|字句解析| B[トークン列]
    B -->|構文解析| C[構文木（AST）]
    C -->|バイトコードに変換| D[バイトコード]
    D -->|実行| E[VMが実行]
```
</div>
</v-click>


