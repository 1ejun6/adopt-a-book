<script setup>
import { computed } from 'vue';
import AppStatusDot from '@/components/shared/AppStatusDot.vue';

const props = defineProps({
  status: { type: String, default: '' },
  requestId: { type: String, default: '' },
  legend: { type: Boolean, default: false },
  dot: { type: Boolean, default: false },
});
const statuses = [
  { key: 'available', label: 'Available to request', tone: 'green' },
  { key: 'unavailable', label: 'Unavailable', tone: 'red' },
  { key: 'requested', label: 'Request sent', tone: 'purple' },
];
const current = computed(() => statuses.find(status => status.key === (
  props.requestId ? 'requested' : props.status === 'available' ? 'available' : 'unavailable'
)));
</script>

<template>
  <span v-if="legend" class="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm" role="group" aria-label="Book availability legend">
    <span v-for="item in statuses" :key="item.key" class="inline-flex items-center gap-2">
      <AppStatusDot :tone="item.tone" />
      {{ item.label }}
    </span>
  </span>
  <span v-else-if="dot" class="inline-flex shrink-0 items-center">
    <AppStatusDot :tone="current.tone" />
    <span class="sr-only">{{ current.label }}.</span>
  </span>
  <span v-else class="sr-only">{{ current.label }}</span>
</template>
