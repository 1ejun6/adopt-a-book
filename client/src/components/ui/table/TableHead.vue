<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <th data-slot="table-head" :class="cn('h-10 px-2 text-left font-medium whitespace-nowrap', props.class)">
    <slot />
  </th>
</template>
