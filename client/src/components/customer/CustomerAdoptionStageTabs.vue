<script setup>
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { activeAdoptionStages } from '@/lib/adoptions';

defineProps({
  counts: { type: Object, required: true },
  showCounts: { type: Boolean, default: true },
});
</script>

<template>
  <TabsList
    aria-label="Active adoption stages"
    class="adoption-tabs adoption-tabs-stages grid min-w-0 grid-cols-4 gap-1 sm:flex sm:gap-3"
  >
    <TabsTrigger
      v-for="item in activeAdoptionStages"
      :key="item.value"
      :value="item.value"
      class="min-h-11 min-w-0 justify-center gap-1.5 px-1 text-xs sm:px-3 sm:text-sm"
    >
      <span>{{ item.label }}</span>
      <span
        v-if="showCounts"
        class="adoption-tab-count rounded bg-badge-neutral px-1.5 py-0.5 text-[11px] tabular-nums sm:text-xs"
        >{{ counts[item.value] }}</span
      >
    </TabsTrigger>
  </TabsList>
</template>
