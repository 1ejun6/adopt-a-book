<script setup>
import { computed } from 'vue';
import { Alert02Icon } from '@hugeicons/core-free-icons';
import { Badge } from '@/components/ui/badge';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import CustomerAdoptionRow from './CustomerAdoptionRow.vue';
import { bookAuthors, displayDate, getApplicationStatus, pickupStatus, hasPickupOptions } from '@/lib/adoptions';

const props = defineProps({
  record: { type: Object, required: true },
  verified: { type: Boolean, default: true },
  groupedOverdueWarning: { type: Boolean, default: false },
});
const emit = defineEmits(['details', 'pickup']);
const title = computed(() => props.record.book?.title || 'Book details unavailable');
const showPickup = computed(
  () =>
    props.record.appointment &&
    ['pickup requested', 'pickup confirmed', 'collected'].includes(props.record.code),
);
const warning = computed(
  () =>
    props.record.warning ||
    (!props.verified && props.record.appointment ? 'Pickup status unavailable' : ''),
);
const overdue = computed(() => warning.value === 'Pickup date has passed');
const pickupOutcome = computed(() =>
  !props.record.history &&
  ['cancelled', 'rejected'].includes(getApplicationStatus(props.record.appointment))
    ? pickupStatus(props.record.appointment).label
    : '',
);
const pickupPlaceholder = computed(() => (props.record.history ? 'No pickup' : 'Not scheduled'));
const authors = computed(() => {
  const values = props.record.book?.authors;
  return Array.isArray(values) && values.length > 1
    ? `${bookAuthors({ authors: values.slice(0, 1) })} +${values.length - 1} more`
    : bookAuthors(props.record.book);
});
const actionLabel = computed(() =>
  props.verified && props.record.action ? props.record.actionLabel : 'View details',
);
function openRecord() {
  if (props.verified && props.record.action) emit('pickup', props.record);
  else emit('details', props.record);
}
</script>

<template>
  <CustomerAdoptionRow
    :id="`adoption-${record.id}`"
    :label="`${actionLabel} for ${title}${overdue ? '. Pickup date has passed' : ''}`"
    @open="openRecord"
  >
    <template #book>
      <AppBookIdentity
        :title="title"
        :author="authors"
        :authorTitle="bookAuthors(record.book)"
        :cover="record.book?.thumbnailurl || record.book?.coverurl"
        coverClass="w-9 sm:w-10"
        wrap
      />
    </template>
    <template #status>
      <Badge :variant="record.variant" class="text-xs font-normal">{{ record.label }}</Badge>
      <p v-if="warning && !(groupedOverdueWarning && overdue)" class="adoption-row__warning">
        {{ warning }}
      </p>
      <p v-else-if="pickupOutcome" class="mt-1 text-xs text-muted-foreground">
        {{ pickupOutcome }}
      </p>
    </template>
    <template #pickup>
      <p v-if="hasPickupOptions(record.appointment)" class="text-sm">{{ displayDate(record.appointment.appointmentdate) }} · Three times proposed</p>
      <template v-else-if="showPickup">
        <p
          class="adoption-row__date"
          :class="{ 'adoption-row__date--past': overdue }"
          :title="overdue ? 'Pickup date has passed' : undefined"
        >
          <HugeiconsIcon
            v-if="overdue"
            :icon="Alert02Icon"
            class="mr-1 inline-block size-3.5 align-[-2px]"
            aria-hidden="true"
          />
          {{ displayDate(record.appointment.appointmentdate) }} ·
          {{ record.appointment.timeslot?.replace(/\s*[–-]\s*/g, '–') || 'Time unavailable' }}
        </p>
        <p class="adoption-row__location" :title="record.appointment.location">
          {{ record.appointment.location || 'Location unavailable' }}
        </p>
      </template>
      <p v-else class="text-sm">{{ pickupPlaceholder }}</p>
    </template>
  </CustomerAdoptionRow>
</template>
