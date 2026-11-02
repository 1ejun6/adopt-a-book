<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <thead data-slot="table-header" :class="cn('border-b', props.class)">
    <slot />
  </thead>
</template>

<style scoped>
/*@1ejun6 > round header without clipping row tape*/
</style>

