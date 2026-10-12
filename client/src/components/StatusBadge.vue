<script setup>
import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';

const props = defineProps({
  status: {type: String, required: true},
  variant: {type: String},
});


// lee-hlmilk > handle case and hyphens, status mapping
const computedVariant = computed(() => {
  const normalized = props.status.toLowerCase().replace(/-/g, ' ').trim();
  if (['available', 'approved', 'pickup confirmed', 'confirmed', 'open'].includes(normalized)) {return 'green'};
  if (['rejected', 'cancelled'].includes(normalized)) {return 'rose'};
  if (['adopted', 'closed', 'withdrawn', 'collected'].includes(normalized)) {return 'neutral'};
  return 'amber';
});
</script>

<template>
  <!-- lee-hlmilk > automated status styling -->
  <Badge :variant="computedVariant" :data-status="status">
    <slot>{{ status }}</slot>
  </Badge>
</template>