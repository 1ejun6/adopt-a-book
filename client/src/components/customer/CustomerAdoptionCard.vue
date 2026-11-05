<script setup>
import { computed } from 'vue';
import { Alert02Icon } from '@hugeicons/core-free-icons';
import AppStatusDot from '@/components/shared/AppStatusDot.vue';
import { adoptionStatusTone } from '@/lib/myAdoptionsPresentation';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import CustomerAdoptionRow from './CustomerAdoptionRow.vue';
import { bookAuthors, displayDate, getApplicationStatus, pickupStatus, hasPickupOptions } from '@/lib/adoptions';

const props = defineProps({
  record: { type: Object, required: true },
  verified: { type: Boolean, default: true },
  groupedOverdueWarning: { type: Boolean, default: false },
});
const emit = defineEmits(['details']);
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
const overdue = computed(() => warning.value === 'Pickup times have passed');
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
</script>

<template>
  <CustomerAdoptionRow
    :id="`adoption-${record.id}`"
    :label="`View request for ${title}. ${record.label}${overdue ? '. Pickup times have passed' : ''}`"
    action="View request"
    @open="emit('details', record)"
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
      <span class="inline-flex items-center justify-center gap-2" :title="record.label"><AppStatusDot :tone="adoptionStatusTone(record)" /><span :class="{ 'sr-only': !record.history }">{{ record.label.toLowerCase() }}</span></span>
      <p v-if="warning && !(groupedOverdueWarning && overdue)" class="adoption-row__warning">
        {{ warning }}
      </p>
      <p v-else-if="pickupOutcome" class="mt-1 text-sm text-muted-foreground">
        {{ pickupOutcome }}
      </p>
    </template>
    <template #pickup>
      <p v-if="hasPickupOptions(record.appointment)" class="text-sm">{{ displayDate(record.appointment.appointmentdate) }} · Times proposed</p>
      <template v-else-if="showPickup">
        <p
          class="adoption-row__date"
          :class="{ 'adoption-row__date--past': overdue }"
          :title="overdue ? 'Pickup times have passed' : undefined"
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
      <p v-else class="text-sm text-muted-foreground">{{ pickupPlaceholder }}</p>
    </template>
  </CustomerAdoptionRow>
</template>
