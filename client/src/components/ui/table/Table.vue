<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <div class="min-w-0 overflow-x-auto rounded-lg border">
      <table :class="cn('w-full text-sm', props.class)">
        <slot />
      </table>
  </div>
</template>
