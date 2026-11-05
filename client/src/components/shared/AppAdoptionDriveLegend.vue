<script setup>
import { computed } from 'vue';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';
import AppStatusLegend from '@/components/shared/AppStatusLegend.vue';
const props = defineProps({ statuses: { type: Array, default: () => ['open', 'closed'] } });
const status = defineModel('status', { type: String, default: 'all' });
const options = computed(() => [
  { value: 'open', tone: 'green' },
  { value: 'closed', tone: 'red' },
  { value: 'cancelled', tone: 'neutral' },
].filter(option => props.statuses.includes(option.value)));
</script>

<template>
  <AppStatusLegend :statuses="options" aria-label="Adoption drive status legend">
    <template #item="{ status: option }">
      <button type="button"
        class="inline-flex min-h-11 items-center bg-transparent"
        :class="{ 'underline underline-offset-4': status === option.value }"
        :aria-pressed="status === option.value"
        @click="status = status === option.value ? 'all' : option.value">
        <AppStatusBadge :status="option.value" :tone="option.tone" />
      </button>
    </template>
  </AppStatusLegend>
</template>
