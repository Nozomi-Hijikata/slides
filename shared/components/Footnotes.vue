<template>
  <div class="footnotes">
    <slot />
  </div>
</template>

<style>
.footnotes {
  position: absolute;
  bottom: 1.5rem;
  left: 2rem;
  right: 2rem;
  font-size: 0.8rem;
  color: #777;
  opacity: 0.8;
  line-height: 1.4;
}

.slidev-layout.center .footnotes {
  text-align: center;
}
</style>
