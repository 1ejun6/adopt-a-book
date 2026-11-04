<script setup>
import { computed } from 'vue';
import { ArrowRight01Icon, Book02Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';

const props = defineProps({
  drive: { type: Object, default: null },
  isLoading: { type: Boolean, default: false },
  showRegistration: { type: Boolean, default: true },
});

const emit = defineEmits(['open']);
// @brod > check if drive has ended
const ended = computed(() => props.drive?.past && props.drive.status !== 'cancelled');
const status = computed(() => ended.value ? 'ended' : props.drive?.status);
const calendarcolour = computed(() => ({ open: 'bg-badge-green', closed: 'bg-badge-rose' })[status.value] || 'bg-badge-neutral');

const when = computed(() => ({
  day: formatDate(props.drive?.eventdate, { day: 'numeric' }),
  month: formatDate(props.drive?.eventdate, { month: 'short' }),
  full: formatDate(props.drive?.eventdate, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }),
}));

//@brod > full formatted date string & total drive capacity label
const slots = computed(() => props.drive?.spotsleft ?? props.drive?.maxcapacity ?? 0);
const bookcount = computed(() => props.drive?.bookCount);
const booklabel = computed(() => `${bookcount.value ?? '—'} ${bookcount.value === 1 ? 'book' : 'books'}`);
</script>

<template>
  <div v-if="props.isLoading" class="flex items-center gap-2.5 rounded-lg border p-5 sm:gap-5" role="status"
    aria-busy="true">
    <Skeleton class="size-14 shrink-0" />
    <div class="flex-1 space-y-2.5">
      <Skeleton class="h-6 w-3/4" />
      <Skeleton class="h-4" />
      <div class="flex justify-between gap-2.5">
        <Skeleton class="h-4 w-1/3" />
        <Skeleton class="h-4 w-1/3" />
      </div>
    </div>
  </div>
  <button v-else-if="drive" type="button"
    class="washi-tape washi-tape-hover flex w-full items-center gap-2.5 rounded-lg border p-5 sm:gap-5 text-left text-sm"
    @click="emit('open')">
    <time :datetime="drive.eventdate"
      class="grid size-14 shrink-0 self-start place-content-center rounded-lg border text-center"
      :class="calendarcolour">
      <strong class="font-heading text-2xl">{{ when.day }}</strong>
      <small class="text-xs">{{ when.month }}</small>
    </time>

    <div class="min-w-0 flex-1 space-y-2.5">
      <div class="flex flex-wrap items-center gap-2.5">
        <h3 class="text-lg">{{ drive.title }}</h3>
        <Badge v-if="showRegistration && drive.registered" variant="green">registered</Badge>
        <Badge v-if="status !== 'open'" variant="neutral">{{ status }}</Badge>
      </div>
      <p class="text-sm">{{ drive.location }}</p>
      <div class="flex flex-wrap items-center justify-between gap-2.5">
        <p class="text-sm">{{ when.full }}</p>
        <div class="flex flex-wrap gap-2.5 sm:gap-5">
          <span v-if="!drive.past" class="flex gap-2.5" title="remaining attendee slots">
            <HugeiconsIcon :icon="UserGroupIcon" class="size-5 shrink-0" aria-hidden="true" />
            {{ slots }} {{ slots === 1 ? 'slot' : 'slots' }} left
          </span>
          <!--@1ejun6 > failed book count lookup shows a dash > zero means no available books-->
          <span class="flex gap-2.5" :title="bookcount == null ? 'book count unavailable' : 'available books nearby'">
            <HugeiconsIcon :icon="Book02Icon" class="size-5 shrink-0" aria-hidden="true" />
            {{ booklabel }}
          </span>
        </div>
      </div>
    </div>

    <HugeiconsIcon :icon="ArrowRight01Icon" class="size-5 shrink-0" aria-hidden="true" />
  </button>
</template>
