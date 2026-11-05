<script setup>
import AppCalendarButton from '@/components/shared/AppCalendarButton.vue';
import { pickupTimeText } from '@/lib/pickupTimes';
import { Button } from '@/components/ui/button';

import { displayDate, pickupStatus, getApplicationStatus } from '@/lib/adoptions';
import CustomerAdoptionInformation from './CustomerAdoptionInformation.vue';
defineProps({
  appointment: Object,
  confirmed: Boolean,
  record: Object,
  status: Object,
  saving: Boolean,
  uncertain: Boolean,
  manageable: Boolean,
  editLabel: String,
  calendar: Object,
});
const confirming = defineModel('confirming', { type: Boolean });
const emit = defineEmits(['pickup-record', 'cancel', 'edit', 'back']);
</script>
<template>
  <h3 class="font-body text-sm font-semibold">
    {{
      getApplicationStatus(appointment) === 'collected'
        ? 'Pickup details'
        : confirmed
          ? 'Confirmed pickup'
          : getApplicationStatus(appointment) === 'pending confirmation'
            ? 'Requested pickup'
            : pickupStatus(appointment).label
    }}
  </h3>
  <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
    <dt class="text-muted-foreground">Date</dt>
    <dd>{{ displayDate(appointment.appointmentdate) }}</dd>
    <dt class="text-muted-foreground">Time</dt>
    <dd class="[overflow-wrap:anywhere]">{{ pickupTimeText(appointment) }} SGT</dd>
    <dt class="text-muted-foreground">Location</dt>
    <dd class="[overflow-wrap:anywhere]">{{ appointment.location || 'Unavailable' }}</dd>
  </dl>
  <p
    v-if="!confirming && (!record || record.warning || !confirmed)"
    class="text-sm text-muted-foreground"
  >
    {{ status.description }}
  </p>
  <CustomerAdoptionInformation
    v-if="!confirming"
    :record="record"
    :appointment="appointment"
    @pickup-record="emit('pickup-record', $event)"
  />
  <section
    v-if="confirming"
    class="space-y-3 rounded-lg bg-badge-purple/40 p-4"
    aria-label="Confirm pickup cancellation"
  >
    <h3 class="text-xl">Cancel this pickup?</h3>
    <p class="text-sm">
      Your adoption will remain approved. You can arrange another pickup if the book is still
      reserved for you.
    </p>
    <div class="adoption-actions">
      <Button
        type="button"
        variant="destructive"
        :disabled="saving || uncertain || !manageable"
        @click="emit('cancel')"
      >
        {{ saving ? 'Cancelling…' : 'Cancel pickup' }}
      </Button>
      <Button type="button" variant="outline" :disabled="saving" @click="confirming = false">
        Keep pickup
      </Button>
    </div>
  </section>
  <div v-else class="adoption-actions adoption-actions-wrap">
    <template v-if="manageable && !uncertain">
      <Button type="button" variant="destructive" :disabled="saving" @click="confirming = true">
        Cancel pickup
      </Button>
      <Button type="button" :disabled="saving" @click="emit('edit')">{{ editLabel }}</Button>
    </template>
    <Button v-else type="button" variant="outline" :disabled="saving" @click="emit('back')">
      Back
    </Button>
  </div>
  <div v-if="!confirming" class="flex flex-wrap gap-x-5 gap-y-2">
    <AppCalendarButton v-if="calendar" :event="calendar" :disabled="saving || uncertain" />
    <p
      v-if="(!manageable || uncertain) && record?.canArrange"
      class="text-sm text-muted-foreground"
    >
      Your adoption stays approved. You can arrange another pickup in Active.
    </p>
  </div>
</template>
