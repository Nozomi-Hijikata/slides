<script setup lang="ts">
const props = defineProps<{
  title: string;
}>();

const title = props.title;
</script>

<template>
  <h1 class="font-bold">{{ title }}</h1>
</template>
