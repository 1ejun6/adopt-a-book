<script setup>
//@1ejun6 > arranges related form fields in one group
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <div data-slot="field-group" :class="cn('flex flex-col gap-5', props.class)">
    <slot />
  </div>
</template>
