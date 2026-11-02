<script setup>
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';

const props = defineProps({
  appointment: { type: Object, required: true },
  book: { type: Object, default: null },
  busy: { type: Boolean, default: false }
});

defineEmits(['view', 'reschedule', 'cancel']);

// Only active appointments can be changed or cancelled.
const active = computed(() =>
  ['pending confirmation', 'appointment confirmed'].includes(
    props.appointment.status
  )
);

const authors = computed(() =>
  props.book?.authors?.join(', ') || 'Author not listed'
);

const date = computed(() => {
  const value = new Date(
    `${props.appointment.appointmentdate}T00:00:00+08:00`
  );

  return Number.isNaN(value.getTime())
    ? 'Date unavailable'
    : value.toLocaleDateString('en-SG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Singapore'
      });
});

const message = computed(() => ({
  'pending confirmation':
    'Your proposed time is awaiting confirmation. Please wait before travelling.',
  'appointment confirmed':
    'Your pickup is confirmed. Please collect your book at the agreed time and location.',
  collected:
    'Your book has been collected. Enjoy your next read!',
  cancelled:
    'This pickup was cancelled.',
  rejected:
    'This proposal was rejected. If your adoption is still approved, you can propose another time.'
}[props.appointment.status] || 'Check back for updates about this pickup.'));
</script>

<template>
  <article class="flex h-full flex-col gap-4 rounded-xl border bg-card p-5">
    <AppBookIdentity
      :title="book?.title || appointment.booktitle || 'Book details unavailable'"
      :author="authors"
      :cover="book?.coverurl"
      cover-class="w-20"
    />

    <div>
      <AppStatusBadge
        :status="appointment.status === 'appointment confirmed'
          ? 'confirmed'
          : appointment.status"
        class="capitalize"
      >
        {{ appointment.status }}
      </AppStatusBadge>
    </div>

    <dl class="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      <dt class="text-muted-foreground">Date</dt>
      <dd>{{ date }}</dd>

      <dt class="text-muted-foreground">Time</dt>
      <dd class="break-words">{{ appointment.timeslot }}</dd>

      <dt class="text-muted-foreground">Location</dt>
      <dd class="break-words">{{ appointment.location }}</dd>
    </dl>

    <div class="mt-auto space-y-4 border-t pt-4">
      <p class="text-sm text-muted-foreground">{{ message }}</p>

      <div class="flex flex-wrap gap-2">
        <Button
          v-if="active"
          :disabled="busy"
          @click="$emit('reschedule')"
        >
          Reschedule
        </Button>

        <Button
          v-if="book?.id"
          variant="outline"
          :disabled="busy"
          @click="$emit('view')"
        >
          View Book
        </Button>

        <Button
          v-if="active"
          variant="outline"
          :disabled="busy"
          @click="$emit('cancel')"
        >
          Cancel Pickup
        </Button>
      </div>
    </div>
  </article>
</template>