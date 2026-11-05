<script setup>
import { computed } from 'vue';
import {
  bookAuthors,
  displayDate,
  getApplicationStatus,
  pickupComplete,
  pickupStatus,
  recordId,
} from '@/lib/adoptions';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import CustomerAdoptionRow from './CustomerAdoptionRow.vue';
import { Badge } from '@/components/ui/badge';
const props = defineProps({
  appointment: { type: Object, required: true },
  book: { type: Object, default: null },
  editable: { type: Boolean, default: false },
  unlinked: { type: Boolean, default: false },
});
const emit = defineEmits(['details', 'edit']);
const title = computed(
  () => props.book?.title || props.appointment.booktitle || 'Book details unavailable',
);
const state = computed(() => pickupStatus(props.appointment));
const needsDetails = computed(
  () =>
    !pickupComplete(props.appointment) &&
    !['collected', 'cancelled', 'rejected'].includes(getApplicationStatus(props.appointment)),
);
const action = computed(() =>
  props.unlinked
    ? 'Check pickup details'
    : needsDetails.value && props.editable
      ? 'Complete pickup details'
      : getApplicationStatus(props.appointment) === 'pending confirmation'
        ? 'View pickup request'
        : 'View pickup',
);
</script>

<template>
  <CustomerAdoptionRow
    :id="`adoption-pickup-${recordId(appointment)}`"
    :label="`${action} for ${title}`"
    :action="action"
    @open="needsDetails && editable && !unlinked ? emit('edit') : emit('details')"
  >
    <template #book>
      <AppBookIdentity
        :title="title"
        :author="unlinked ? 'Unlinked pickup record' : book ? bookAuthors(book) : ''"
        :cover="book?.thumbnailurl || book?.coverurl"
        coverClass="w-9 sm:w-10"
        wrap
      />
    </template>
    <template #status>
      <Badge :variant="state.variant" class="text-sm font-normal">{{ state.label }}</Badge>
      <p v-if="unlinked || needsDetails" class="adoption-row__warning">
        {{ unlinked ? 'Needs checking' : 'Pickup details incomplete' }}
      </p>
    </template>
    <template #pickup>
      <p class="adoption-row__date">
        {{ displayDate(appointment.appointmentdate) }} ·
        {{ appointment.timeslot?.replace(/\s*[–-]\s*/g, '–') || 'Time unavailable' }}
      </p>
      <p class="adoption-row__location" :title="appointment.location">
        {{ appointment.location || 'Location unavailable' }}
      </p>
    </template>
  </CustomerAdoptionRow>
</template>
