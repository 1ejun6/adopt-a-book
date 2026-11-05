<script setup>
import { Badge } from '@/components/ui/badge';
import { journeyTabs } from '@/lib/adoptions';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
defineProps({
  counts: { type: Object, required: true },
  showCounts: { type: Boolean, default: true },
});
</script>

<template>
  <TabsList aria-label="Your adoptions" class="adoption-tabs adoption-tabs-primary w-full">
    <TabsTrigger v-for="item in journeyTabs" :key="item.value" :value="item.value"
      class=" flex-1 gap-2.5 sm:flex-none">
      <span>{{ item.label }}</span>
      <Badge v-if="showCounts" variant="neutral" class="adoption-tab-count tabular-nums">
        {{ counts[item.value] }}
      </Badge>
    </TabsTrigger>
  </TabsList>
</template>
