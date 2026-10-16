<script setup>
const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <tbody data-slot="table-body" :class="props.class">
    <slot />
  </tbody>
</template>
