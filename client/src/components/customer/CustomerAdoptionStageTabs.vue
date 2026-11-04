<script setup>
import { TabsList, TabsTrigger } from 'reka-ui';
import { activeAdoptionStages } from '@/lib/adoptions';

defineProps({
  counts: { type: Object, required: true },
  showCounts: { type: Boolean, default: true },
});
</script>

<template>
  <TabsList
    aria-label="Active adoption stages"
    class="grid min-w-0 grid-cols-4 gap-1 border-b sm:flex sm:gap-3"
  >
    <TabsTrigger
      v-for="item in activeAdoptionStages"
      :key="item.value"
      :value="item.value"
      class="flex min-h-11 min-w-0 items-center justify-center gap-1.5 border-b-2 border-transparent px-1 py-2 text-xs text-muted-foreground outline-offset-4 data-[state=active]:border-foreground data-[state=active]:font-semibold data-[state=active]:text-foreground sm:px-3 sm:text-sm"
    >
      <span>{{ item.label }}</span>
      <span
        v-if="showCounts"
        class="rounded bg-badge-neutral px-1.5 py-0.5 text-[11px] tabular-nums sm:text-xs"
        >{{ counts[item.value] }}</span
      >
    </TabsTrigger>
  </TabsList>
</template>
