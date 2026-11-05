<script setup>
import { computed } from 'vue';
import AppStatusDot from '@/components/shared/AppStatusDot.vue';
import AppStatusLegend from '@/components/shared/AppStatusLegend.vue';

const props = defineProps({
  status: { type: String, default: '' },
  requestId: { type: String, default: '' },
  legend: { type: Boolean, default: false },
  dot: { type: Boolean, default: false },
});
const statuses = [
  { key: 'available', label: 'Available', tone: 'green' },
  { key: 'unavailable', label: 'Unavailable', tone: 'red' },
  { key: 'requested', label: 'Requested', tone: 'purple' },
];
const current = computed(() => statuses.find(status => status.key === (
  props.requestId ? 'requested' : props.status === 'available' ? 'available' : 'unavailable'
)));
</script>

<template>
  <AppStatusLegend v-if="legend" :statuses="statuses.map(item => ({ ...item, value: item.key }))" aria-label="Book availability legend" />
  <span v-else-if="dot" class="inline-flex shrink-0 items-center">
    <AppStatusDot :tone="current.tone" />
    <span class="sr-only">{{ current.label }}.</span>
  </span>
  <span v-else class="sr-only">{{ current.label }}</span>
</template>
