<script setup>
// wooden shelves of spines > wraps onto a new shelf when the row is full
import BookSpine from './BookSpine.vue';

defineProps({
  books: { type: Array, required: true },
  selectedId: { type: String, default: null },
});

const emit = defineEmits(['select']);
</script>

<template>
  <div class="flex flex-wrap items-end justify-center gap-y-10">
    <div v-for="(book, index) in books" :key="book.id" class="flex flex-col">
      <!-- each spine brings its own piece of shelf so wrapped rows still sit on a plank -->
      <div class="flex items-end border-b-10 border-[#e8c9a9] px-1 pt-6">
        <BookSpine :book="book" :index="index" :selected="book.id === selectedId" @select="emit('select', $event)" />
      </div>
      <!-- optional text under each book > e.g. distance labels on the browse page -->
      <div v-if="$slots.label" class="h-10 w-18 pt-1 text-center text-xs leading-tight">
        <slot name="label" :book="book" :index="index" />
      </div>
    </div>
    <p v-if="!books.length" class="py-16 text-muted-foreground">No books match that search yet.</p>
  </div>
</template>
