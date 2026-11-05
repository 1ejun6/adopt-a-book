<script setup>
import { computed } from 'vue';
import AppStatusDot from '@/components/shared/AppStatusDot.vue';

const props = defineProps({
  status: { type: String, required: true },
  dot: { type: Boolean, default: false },
  tone: { type: String, default: '' },
});

//@lee-hlmilk > shorten appointment labels for display > keep API statuses unchanged
const statusLabel = computed(() => ({ 'pending confirmation': 'pending', 'appointment confirmed': 'confirmed' })[props.status] || props.status);

//@lee-hlmilk > match lowercase statuses to badge colors
const badgeColour = computed(() => {
  const status = props.status.toLowerCase().trim();
  if (['available', 'approved', 'pickup confirmed', 'appointment confirmed', 'confirmed', 'open', 'registered'].includes(status)) { return 'green'; }
  if (['rejected', 'closed'].includes(status)) { return 'red'; }
  if (['adopted', 'collected', 'ended', 'cancelled'].includes(status)) { return 'neutral'; }

  return 'amber';
});
</script>

<template>
  <span class="inline-flex items-center gap-2 text-sm text-foreground" :data-status="status">
    <AppStatusDot :tone="tone || badgeColour" />
    <span v-if="dot" class="sr-only">{{ statusLabel }}</span>
    <slot v-else>{{ statusLabel }}</slot>
  </span>
</template>
