<script setup>
import { computed } from 'vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { historyAdoptionTabs } from '@/lib/myAdoptionsPresentation';
const historyStatuses = {
  collected: { status: 'collected', tone: 'green' },
  withdrawn: { status: 'withdrawn', tone: 'neutral' },
  rejected: { status: 'rejected', tone: 'red' },
  'cancelled-pickups': { status: 'pickup cancelled', tone: 'neutral' },
  'declined-pickups': { status: 'pickup declined', tone: 'red' },
};
const props = defineProps({ counts: { type: Object, required: true }, showCounts: Boolean });
const tabs = computed(() => historyAdoptionTabs.filter(item => !item.value.endsWith('-pickups') || props.counts[item.value]));
</script>

<template>
  <TabsList aria-label="History outcomes" class="adoption-tabs">
    <TabsTrigger v-for="item in tabs" :key="item.value" :value="item.value">
      <span>{{ item.label }}</span>
      <StatusBadge v-if="showCounts && historyStatuses[item.value]" v-bind="historyStatuses[item.value]" class="tabular-nums">{{ counts[item.value] }}</StatusBadge>
      <Badge v-else-if="showCounts" class="bg-primary tabular-nums">{{ counts[item.value] }}</Badge>
    </TabsTrigger>
  </TabsList>
</template>
