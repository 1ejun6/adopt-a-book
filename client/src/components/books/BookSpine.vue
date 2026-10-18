<script setup>
// one book spine on the shelf > reused by guest / customer / admin shelves
import { computed } from 'vue';
import { FavouriteIcon } from '@hugeicons/core-free-icons';

const props = defineProps({
  book: { type: Object, required: true },
  index: { type: Number, default: 0 },
  selected: { type: Boolean, default: false },
});

const emit = defineEmits(['select']);

const colours = ['#f3e1cc', '#f5e9b8', '#f2d6c9', '#e9dcf2', '#f9e1e1', '#dcebd9', '#d9e6f2'];
const heights = ['18rem', '19rem', '20rem', '18.5rem', '19.5rem'];

const unavailable = computed(() => props.book.status !== 'available');
</script>

<template>
  <button type="button" :aria-label="`preview ${book.title}`" :aria-pressed="selected"
    :class="[selected ? '-translate-y-6 -rotate-6 ring-4 ring-foreground' : 'hover:-translate-y-2', unavailable && 'opacity-60']"
    class="relative flex w-16 shrink-0 origin-bottom flex-col items-center rounded-t-md rounded-b-sm border-2 border-foreground px-1 pt-3 pb-2 shadow-[3px_0_0_rgba(99,59,34,0.25)] transition-transform"
    :style="{ backgroundColor: colours[index % colours.length], height: heights[index % heights.length] }" @click="emit('select', book)">
    <span v-if="selected" class="absolute -top-8 rounded-full bg-foreground px-2 text-[10px] text-background uppercase">Selected</span>
    <span class="mb-2 w-full truncate border-y border-foreground/50 py-1 text-center text-[10px] uppercase">{{ book.authors[0].split(' ').pop() }}</span>
    <span class="flex min-h-0 flex-1 gap-1 [writing-mode:vertical-rl]"> <!-- rotates text to read down the spine -->
      <span class="truncate font-heading text-xl leading-none">{{ book.title }}</span>
    </span>
    <HugeiconsIcon :icon="FavouriteIcon" class="mt-2 size-4 shrink-0" aria-hidden="true" />
  </button>
</template>
