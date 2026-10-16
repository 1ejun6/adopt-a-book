<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <tfoot data-slot="table-footer" :class="cn('border-t', props.class)">
    <slot />
  </tfoot>
</template>
