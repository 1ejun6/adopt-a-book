<script setup>
import { computed } from 'vue';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';
import { formatDate } from '@/lib/utils';

const props = defineProps({
  drive: { type: Object, required: true },
});

const emit = defineEmits(['open']);
//@brod > Anything that is not open is greyed out.
const isOpen = computed(() => props.drive.status === 'open');
//@brod > Day and month for the tile, full date for the line below.
const when = computed(() => ({
  day: formatDate(props.drive.eventdate, { day: 'numeric' }),
  month: formatDate(props.drive.eventdate, { month: 'short' }),
  full: formatDate(props.drive.eventdate, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }),
}));

//@brod > en-CA matches eventdate (YYYY-MM-DD) so the gap is whole days.
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
//@brod > "today", "tomorrow", or "in 12 days".
const relativeDays = new Intl.RelativeTimeFormat('en-SG', { numeric: 'auto' });
//@brod > Date, how soon, and how many places.
const meta = computed(() => {
  const daysAway = relativeDays.format(
    Math.round((Date.parse(props.drive.eventdate) - Date.parse(today)) / 86400000),
    'day',
  );
  return `${when.value.full} · ${daysAway} · ${props.drive.maxcapacity} places`;
});
</script>

<template>
  <!--@brod >  button so keyboard focus works without extra handlers.-->
  <button
    type="button"
    aria-haspopup="dialog"
    class="washi-tape washi-tape-hover flex w-full items-center gap-2.5 rounded-lg border p-5 text-left sm:gap-5"
    @click="emit('open')"
  >
    <!--@brod > Screen readers use the date line below instead.-->
    <time
      :datetime="drive.eventdate"
      aria-hidden="true"
      class="flex size-15 shrink-0 flex-col items-center justify-center rounded-lg border border-foreground"
      :class="isOpen ? 'bg-badge-rose' : 'bg-badge-neutral'"
    >
      <strong class="font-heading text-2xl font-normal leading-none">{{ when.day }}</strong>
      <small class="text-xs uppercase">{{ when.month }}</small>
    </time>

    <span class="min-w-0 flex-1 space-y-1" :class="{ 'text-muted-foreground': !isOpen }">
      <AppStatusBadge as="span" :status="drive.status" class="text-xs" />
      <!--@brod > Two lines before clipping. Phones cannot hover.-->
      <strong :title="drive.title" class="line-clamp-2 font-heading text-xl font-normal">
        {{ drive.title }}
      </strong>
      <span class="block truncate text-sm">{{ drive.location }}</span>
      <span class="block text-sm text-muted-foreground">{{ meta }}</span>
    </span>

    <HugeiconsIcon :icon="ArrowRight01Icon" aria-hidden="true" />
  </button>
</template>
