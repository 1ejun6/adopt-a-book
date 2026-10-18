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
    <TableCell :class="cn('p-4 text-center', props.class)" v-bind="delegatedProps">
      <div class="py-10">
        <slot />
      </div>
    </TableCell>
  </TableRow>
</template>
