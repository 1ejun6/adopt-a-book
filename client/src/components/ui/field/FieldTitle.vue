<script setup>
//@1ejun6 > displays a short title for a field
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <div data-slot="field-label" :class="cn('text-sm font-medium', props.class)">
    <slot />
  </div>
</template>
