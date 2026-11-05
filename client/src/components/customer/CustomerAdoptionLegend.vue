<script setup>
import { computed } from 'vue';
import AppStatusLegend from '@/components/shared/AppStatusLegend.vue';
import { pickupStatus } from '@/lib/adoptions';
import { activeAdoptionStatusLegend, historyAdoptionStatusLegend, adoptionStatusTone } from '@/lib/myAdoptionsPresentation';

const props = defineProps({
  tab: { type: String, default: 'active' },
  searching: Boolean,
  entries: { type: Array, default: () => [] },
});
const statuses = computed(() => {
  const history = [...historyAdoptionStatusLegend];
  // Unlinked ended pickups can also appear in History.
  for (const entry of props.entries) {
    if (entry.kind !== 'unlinked') continue;
    const status = pickupStatus(entry.appointment);
    if (!['Collected', 'Pickup cancelled', 'Pickup declined'].includes(status.label)) continue;
    if (!history.some(item => item.label === status.label.toLowerCase())) {
      history.push({ value: status.label, label: status.label.toLowerCase(), tone: adoptionStatusTone(status) });
    }
  }
  if (props.searching) return [...activeAdoptionStatusLegend, ...history];
  return props.tab === 'history' ? history : activeAdoptionStatusLegend;
});
</script>

<template>
  <AppStatusLegend :statuses="statuses" aria-label="Adoption status legend" />
</template>
