<script setup>
//@1ejun6 > displays legend for a fieldset
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <legend data-slot="field-legend" :class="cn('mb-3', props.class)">
    <slot />
  </legend>
</template>
