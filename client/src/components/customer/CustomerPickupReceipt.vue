<script setup>
import { pickupTimeText } from '@/lib/pickupTimes';
import { Button } from '@/components/ui/button';

import { displayDate, pickupStatus, getApplicationStatus, recordId } from '@/lib/adoptions';

defineProps({
  result: String,
  receipt: Object,
  operation: Object,
  manageable: Boolean,
  saving: Boolean,
});

const emit = defineEmits(['edit', 'leave']);
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
    class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm"
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
    Your three times have been sent. The team will select one; check Waiting in My Adoptions for
    confirmation.
  </p>
  <details class="text-sm">
    <summary class="min-h-11 cursor-pointer py-3 underline underline-offset-4">
      Reference details
    </summary>
    <p class="select-all [overflow-wrap:anywhere]">Pickup reference: {{ recordId(receipt) }}</p>
  </details>
  <div class="adoption-actions">
    <Button
      v-if="result === 'current' && operation?.kind === 'save' && manageable"
      type="button"
      variant="outline"
      :disabled="saving"
      @click="emit('edit')"
      >Continue editing request</Button
    >
    <Button type="button" :disabled="saving" @click="emit('leave')"> Back to my adoptions </Button>
  </div>
</template>
