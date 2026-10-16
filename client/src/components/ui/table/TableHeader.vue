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
thead {
  clip-path: inset(0 round 8px 8px 0 0); /*@1ejun6 > round header without clipping row tape*/
}
</style>

