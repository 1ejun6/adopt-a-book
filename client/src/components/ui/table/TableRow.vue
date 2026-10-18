<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <tr data-slot="table-row" :class="cn('border-b last:border-b-0', props.class)">
    <slot />
  </tr>
</template>
