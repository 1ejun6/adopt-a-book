<script setup>
import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';

const props = defineProps({
  status: { type: String, required: true },
  variant: { type: String }
});

//@lee-hlmilk > shorten appointment labels for display > keep API statuses unchanged
const statusLabel = computed(() => ({ 'pending confirmation': 'pending', 'appointment confirmed': 'confirmed' })[props.status] || props.status);

//@lee-hlmilk > match lowercase statuses to badge colors
const badgeColour = computed(() => {
  const status = props.status.toLowerCase().trim();
  if (['available', 'approved', 'pickup confirmed', 'appointment confirmed', 'confirmed', 'open'].includes(status)) { return 'green'; }
  if (['rejected', 'cancelled'].includes(status)) { return 'rose'; }
  if (['adopted', 'closed', 'collected'].includes(status)) { return 'neutral'; }

  return 'amber';
});
</script>

<template>
  <!--@lee-hlmilk > automated status styling-->
  <Badge :variant="badgeColour" :data-status="status">
    <slot>{{ statusLabel }}</slot>
  </Badge>
</template>
