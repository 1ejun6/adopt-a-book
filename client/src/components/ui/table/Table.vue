<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
  compact: { type: Boolean, default: false },
});
</script>

<template>
  <!--@lee-hlmilk > compact tables fit their container > full tables retain tape spacing &&& horizontal scrolling-->
  <!--@lee-hlmilk > full-table padding leaves room for tape outside cells > matching negative margins keep the border aligned-->
  <div :class="props.compact ? 'min-w-0 overflow-hidden' : '-m-2.5 min-w-0 overflow-x-auto p-2.5'">
    <!--@lee-hlmilk > fixed layout keeps columns independent of row content > narrow screens scroll at a consistent table width-->
    <div :class="cn('rounded-lg border', !props.compact && 'min-w-[56rem]')">
      <table :class="cn('w-full table-fixed text-sm', props.class)">
        <slot />
      </table>
    </div>
  </div>
</template>
