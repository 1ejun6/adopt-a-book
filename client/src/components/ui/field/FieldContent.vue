<script setup>
//@1ejun6 > arranges text & controls inside a field
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <div data-slot="field-content" :class="cn('flex-1 space-y-2.5', props.class)">
    <slot />
  </div>
</template>
