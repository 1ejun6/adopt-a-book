<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { pickupTimeText } from '@/lib/pickupTimes';
import { Button } from '@/components/ui/button';

import { displayDate, pickupStatus, getApplicationStatus } from '@/lib/adoptions';

defineProps({
  result: String,
  receipt: Object,
  operation: Object,
  manageable: Boolean,
  saving: Boolean,
});

const emit = defineEmits(['edit']);
</script>
<template>
  <p v-if="getApplicationStatus(receipt) === 'appointment confirmed'" class="text-sm">
    Your pickup is confirmed for the time selected by the team.
  </p>
  <p v-if="result === 'cancelled' || result === 'current'" class="text-sm">
    {{
      result === 'cancelled'
        ? 'Your pickup has been cancelled. Your adoption is still approved.'
        : result === 'current'
          ? 'A pickup already exists for this book. Check its details below.'
          : pickupStatus(receipt).description
    }}
  </p>
  <dl
    v-if="result !== 'cancelled'"
    class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 border-b pb-5 text-sm"
  >
    <dt class="text-muted-foreground">Date</dt>
    <dd>{{ displayDate(receipt.appointmentdate) }}</dd>
    <dt class="text-muted-foreground">Time</dt>
    <dd class="[overflow-wrap:anywhere]">{{ pickupTimeText(receipt) }} SGT</dd>
    <dt class="text-muted-foreground">Location</dt>
    <dd class="[overflow-wrap:anywhere]">{{ receipt.location }}</dd>
  </dl>
  <p
    v-if="getApplicationStatus(receipt) === 'pending confirmation'"
    class="text-sm text-muted-foreground"
  >
    Your proposed times have been sent. The team will confirm one. Check My Adoptions for
    confirmation before travelling.
  </p>
  <div v-if="result === 'current' && operation?.kind === 'save' && manageable" class="adoption-actions">
    <Button
      type="button"
      variant="outline"
      :disabled="saving"
      @click="emit('edit')"
      ><AppIcon name="next" />Continue editing request</Button
    >
  </div>
</template>
