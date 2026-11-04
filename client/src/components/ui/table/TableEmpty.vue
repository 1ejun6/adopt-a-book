<script setup>
import { reactiveOmit } from '@vueuse/core';
import { cn } from '@/lib/utils';
import TableCell from './TableCell.vue';
import TableRow from './TableRow.vue';

const props = defineProps({
  class: { type: null, required: false },
  colspan: { type: Number, required: false, default: 1 },
});

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <TableRow>
    <TableCell :class="cn('py-10 text-center', props.class)" v-bind="delegatedProps">
      <slot />
    </TableCell>
  </TableRow>
</template>
