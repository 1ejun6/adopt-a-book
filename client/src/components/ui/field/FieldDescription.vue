<script setup>
//@1ejun6 > displays helper text for a form field
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <p data-slot="field-description" :class="cn('text-sm text-muted-foreground', props.class)">
    <slot />
  </p>
</template>
