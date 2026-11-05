<script setup>
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Badge } from '@/components/ui/badge';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { activeAdoptionStages } from '@/lib/adoptions';

const stageStatuses = { 'needs-action': { status: 'action needed', tone: 'purple' }, waiting: { status: 'pending', tone: 'amber' }, pickups: { status: 'pickup confirmed', tone: 'green' } };

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
      <StatusBadge v-if="showCounts && stageStatuses[item.value]" v-bind="stageStatuses[item.value]" class="tabular-nums">{{ counts[item.value] }}</StatusBadge>
      <Badge v-else-if="showCounts" class="bg-primary tabular-nums">{{ counts[item.value] }}</Badge>
    </TabsTrigger>
  </TabsList>
</template>
