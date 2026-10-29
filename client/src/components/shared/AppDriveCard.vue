<script setup>
import { computed } from 'vue';
import { ArrowRight01Icon, Book02Icon, UserGroupIcon } from '@hugeicons/core-free-icons';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';
import { formatDate } from '@/lib/utils';

const props = defineProps({
  drive: { type: Object, required: true },
});

const emit = defineEmits(['open']);
// @brod > Check if drive has ended 
const ended = computed(() => props.drive.past && props.drive.status !== 'cancelled');
const isOpen = computed(() => props.drive.status === 'open' && !props.drive.past);

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

//@brod > Full formatted date string and total drive capacity label.
const meta = computed(() => when.value.full);
const spots = computed(() => `${props.drive.maxcapacity} places`);
</script>

<template>
  <button
    type="button"
    class="washi-tape washi-tape-hover flex w-full items-center gap-4 rounded-lg border p-4 text-left"
    @click="emit('open')"
  >
    <time
      :datetime="drive.eventdate"
      class="flex size-14 flex-col items-center justify-center rounded-lg border"
      :class="isOpen ? 'bg-badge-rose' : 'bg-badge-neutral'"
    >
      <strong class="font-heading text-2xl leading-none">{{ when.day }}</strong>
      <small class="text-xs uppercase">{{ when.month }}</small>
    </time>

    <div class="flex flex-1 flex-col gap-1">
      <!-- @brod current status  -->
      <AppStatusBadge as="span" :status="ended ? 'closed' : drive.status" class="w-fit text-xs">
        {{ ended ? 'ended' : drive.status }}
      </AppStatusBadge>
      <h3 class="text-lg">{{ drive.title }}</h3>
      <p class="text-sm">{{ drive.location }}</p>
      <p class="text-sm">{{ meta }}</p>

      <div class="flex items-center gap-3 text-sm">
        <span v-if="!drive.past" class="flex items-center gap-1">
          <HugeiconsIcon :icon="UserGroupIcon" class="size-4" />
          {{ spots }}
        </span>
        <!-- @brod how to show current book count -->
        <span class="flex items-center gap-1">
          <HugeiconsIcon :icon="Book02Icon" class="size-4" />
          {{ drive.bookCount ?? 0 }} books
        </span>
      </div>
    </div>

    <HugeiconsIcon :icon="ArrowRight01Icon" />
  </button>
</template>
