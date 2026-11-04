<script setup>
//@1ejun6 > displays accessible label for a form field
import { Label } from '@/components/ui/label';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <Label data-slot="field-label" :class="props.class">
    <slot />
  </Label>
</template>
