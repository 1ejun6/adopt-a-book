<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <th data-slot="table-head" :class="cn('p-2.5 text-left whitespace-nowrap', props.class)">
    <slot />
  </th>
</template>
