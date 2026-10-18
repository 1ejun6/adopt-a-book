<script setup>
import { Badge } from '@/components/ui/badge';

defineProps({
  book: { type: Object, required: true },
  index: { type: Number, default: 0 },
  selected: { type: Boolean, default: false },
});

const emit = defineEmits(['select']);

//@ChitanyaBharathi > spine colours and heights
const colours = ['#f3e1cc', '#f5e9b8', '#f2d6c9', '#e9dcf2', '#f9e1e1', '#dcebd9', '#d9e6f2'];
const heights = ['18rem', '19rem', '20rem', '18.5rem', '19.5rem'];
</script>

<template>
  <!--@ChitanyaBharathi > selected book lifts and tilts-->
  <button
    :class="[selected ? '-translate-y-5 -rotate-6 ring-4' : 'hover:-translate-y-2.5', book.status !== 'available' && 'opacity-60']"
    class="relative flex w-16 origin-bottom flex-col items-center gap-2.5 rounded-lg border-2 border-foreground p-1 transition"
    :style="{ backgroundColor: colours[index % colours.length], height: heights[index % heights.length] }"
    @click="emit('select', book)">
    <!--@ChitanyaBharathi > tag above the spine-->
    <Badge v-if="selected" class="absolute -top-8">Selected</Badge>
    <!--@ChitanyaBharathi > author surname-->
    <span class="w-full truncate border-y text-center text-xs">{{ book.authors[0].split(' ').pop() }}</span>
    <!--@ChitanyaBharathi > title reads downwards-->
    <span class="flex-1 truncate font-heading text-xl [writing-mode:vertical-rl]">{{ book.title }}</span>
  </button>
</template>
