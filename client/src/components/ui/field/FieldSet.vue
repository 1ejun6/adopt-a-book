<script setup>
//@1ejun6 > groups related form fields in a fieldset
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <fieldset data-slot="field-set" :class="cn('space-y-5', props.class)">
    <slot />
  </fieldset>
</template>
