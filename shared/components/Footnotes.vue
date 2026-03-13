<template>
  <div class="footnotes">
    <slot />
  </div>
</template>

<style scoped>
.footnotes {
  position: absolute;
  bottom: 1.5rem;
  left: 2rem;
  right: 2rem;
  font-size: 0.6rem;
  color: #999;
  opacity: 0.8;
  line-height: 1.4;
}
</style>
