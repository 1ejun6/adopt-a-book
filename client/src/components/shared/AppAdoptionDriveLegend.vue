<script setup>
import { computed } from 'vue';
import AppStatusDot from '@/components/shared/AppStatusDot.vue';
const props = defineProps({ statuses: { type: Array, default: () => ['open', 'closed'] } });
const status = defineModel('status', { type: String, default: 'all' });
const options = computed(() => [
  { value: 'open', tone: 'green' },
  { value: 'closed', tone: 'red' },
  { value: 'cancelled', tone: 'red' },
].filter(option => props.statuses.includes(option.value)));
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm" role="group" aria-label="Adoption drive status legend">
    <button v-for="option in options" :key="option.value" type="button"
      class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-transparent"
      :class="{ 'underline underline-offset-4': status === option.value }"
      :aria-pressed="status === option.value"
      @click="status = status === option.value ? 'all' : option.value">
      <AppStatusDot :tone="option.tone" />
      {{ option.value }}
    </button>
  </div>
</template>
