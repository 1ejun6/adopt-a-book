<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <div data-slot="dialog-header" :class="cn('space-y-2.5 border-b p-5 pr-20', props.class)">
    <slot />
  </div>
</template>
