<template>
  <div class="footnotes">
    <slot />
  </div>
</template>

<!--
  per-slide で色を変えたい場合は <style> ブロックで CSS 変数を上書きできる:

    <style>
    :root { --footnotes-color: #f8f8f2; }
    </style>

  指定しなければ light テーマ (geist など) では #777、dark テーマ (dracula など)
  では #bbb が使われる。Slidev が html.dark を切り替えるのを利用している。
-->
<style>
.footnotes {
  position: absolute;
  bottom: 1.5rem;
  left: 2rem;
  right: 2rem;
  font-size: 0.8rem;
  color: var(--footnotes-color, #777);
  opacity: var(--footnotes-opacity, 0.8);
  line-height: 1.4;
}

html.dark .footnotes {
  color: var(--footnotes-color, #bbb);
}

.slidev-layout.center .footnotes {
  text-align: center;
}
</style>
