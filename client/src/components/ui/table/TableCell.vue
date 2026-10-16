<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <td data-slot="table-cell" :class="cn('p-2.5 align-middle whitespace-nowrap', props.class)"> <!--@1ejun6 > vertically centers cell content > keeps text on one line instead of wrapping-->
    <slot />
  </td>
</template>
