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

# Flutter公式パッケージにコントリビュートするまで
2025 10月 合宿LT - 2025/10/16 MS芝浦ビル

ジョブハウス開発 土方

---
layout: center
---

# 今日はね

---
layout: center
---

# OSSはいいぞという話をします


---
layout: center
---

# ある日のこと 

---
layout: center
---

## いつものようにリリース前のQA依頼を終えて、<br>審査準備をしようかと思っていたところ、、☕️

---
layout: center
---

<div v-click>
  <h2>QA（Kさん）からバグ報告が！！</h2>
  <img src='/public/qa_report.png' class='w-1/2'/>
</div>
<p v-click>いつもありがとうございます、、、</p>


---
layout: center
---

# アプリのディープリンクにバグがあるよ！！

---
layout: default
---

# 参考）ディープリンクとは
<h2 class='text-xl'>
  iOS: Universal Link / Android: App Links
</h2>
<p>
  URLをクリックで対応するアプリのViewに遷移させることができる
</p>
<p>
  アプリの実装で、遷移するリンクに応じて処理を切り替えたりも可能
</p>

TODO: 図を貼る

---
layout: default
---

<div class='flex flex-row gap-6'>
  <div class='flex-1 flex flex-col justify-center text-left'>
    <h2 v-click>ディープリンクからの遷移時に<br/>検索条件が切り替わらない！！</h2>
    <ul class='m-0 p-0' v-click>
      <li>※領域ごとにモードをディープリンクで切り替える機能</li>
    </ul>
    <ul v-click>
      <li>✅ jobhouse.jp/factory -> <strong>工場</strong>のモード(添付画像) </li>
      <li>❌ jobhouse.jp -> <strong>全領域</strong>のモード</li> 
    </ul>
  </div>
  <div class='flex-1 flex justify-center mt-4'>
    <img src='/public/app_search.png' class='w-1/2'/>
  </div>
</div>

---
layout: center
---

## しかも、Androidでコールドスタート※でのみ再現
<p>※アプリをキルした状態</p>
<p class="text-2xl font-bold" v-click>どういうわけかiOSは大丈夫</p>

---
layout: center
---

# はて、、、🤔

---
layout: center
---

# 調査開始🤩


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


