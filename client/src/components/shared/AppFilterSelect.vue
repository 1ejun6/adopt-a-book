<script setup>
const value = defineModel({ type: String, default: '' });
</script>

<template>
  <select v-model="value" class="h-[46px] w-full min-w-0 rounded-lg border bg-transparent p-2.5 text-sm font-normal sm:w-44">
    <slot />
  </select>
</template>
