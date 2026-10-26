<script setup>
import { cn } from '@/lib/utils';

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <div class="-m-2.5 min-w-0 overflow-x-auto p-2.5"> <!--@1ejun6 > room for tape; negative margin keeps table aligned-->
    <!--@lee-hlmilk > fixed layout keeps columns independent of row content > narrow screens scroll at a consistent table width-->
    <div class="min-w-[56rem] rounded-lg border">
      <table :class="cn('w-full table-fixed text-sm', props.class)">
        <slot />
      </table>
    </div>
  </div>
</template>
