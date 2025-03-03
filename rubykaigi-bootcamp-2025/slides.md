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
<v-click>
  <h2> 午前の部 </h2>
  <p class="text-2xl text-black">Rubyの言語処理系について<strong>全体像</strong>を把握してもらいます</p>
  <v-click>
    <ul class="text-xl">
      <li>プログラミング言語処理系の前提知識</li>
      <li>Rubyの言語処理系におけるステップの全体像</li>
    </ul>
  </v-click>
</v-click>

<v-click>
  <h2> 午後の部 </h2>
  <p class="text-2xl text-black"><strong>より各論的な内容にDeepDive</strong>していきます</p>
  <v-click>
    <ul class="text-xl">
      <li>Parser周り: Prism, Lrama...</li>
      <li>並行・並列処理: スレッド/プロセス, 排他処理, イベント駆動, Fiber, Ractor...</li>
      <li>JITコンパイラの動向: RJIT, YJIT, LBBV, ...</li>
    </ul>
  </v-click>
</v-click>

---
src: ./pages/ruby-process.md
---

---
src: ./pages/yjit.md
---
