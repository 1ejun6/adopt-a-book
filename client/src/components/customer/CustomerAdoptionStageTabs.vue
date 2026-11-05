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
    class="adoption-tabs"
  >
    <TabsTrigger
      v-for="item in activeAdoptionStages"
      :key="item.value"
      :value="item.value"

    >
      <span>{{ item.label }}</span>
      <span
        v-if="showCounts"
        class="adoption-tab-count tabular-nums"
        >{{ counts[item.value] }}</span
      >
    </TabsTrigger>
  </TabsList>
</template>
