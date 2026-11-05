<script setup>
import bookspine from '@/assets/bookspine.svg';
import { Skeleton } from '@/components/ui/skeleton';
defineProps({
  books: { type: Array, default: () => [] },
  loading: Boolean,
  savedIds: { type: Set, default: () => new Set() },
});
defineEmits(['select']);
const colours = [
  'bg-badge-rose',
  'bg-badge-neutral',
  'bg-badge-amber',
  'bg-badge-green',
  'bg-primary',
];
</script>

<template>
  <div class="shelf" :aria-busy="loading" aria-label="Available books">
    <template v-if="loading">
      <Skeleton v-for="index in 5" :key="index" class="spine placeholder"
        ><img :src="bookspine" alt="" width="80" height="280"
      /></Skeleton>
      <span class="sr-only">Loading available books</span>
    </template>
    <button
      v-for="(book, index) in loading ? [] : books"
      :key="book.id"
      type="button"
      class="spine"
      :class="colours[index % colours.length]"
      :aria-label="`${book.title} by ${(book.authors || []).join(', ')}${savedIds.has(book.id) ? ', saved' : ''}`"
      aria-haspopup="dialog"
      @click="$emit('select', book)"
    >
      <img :src="bookspine" alt="" width="80" height="280" />
      <span class="binding"
        ><span class="author">{{ (book.authors || []).join(', ') }}</span
        ><span class="title">{{ book.title }}</span></span
      >
    </button>
  </div>
</template>

<style scoped>
.shelf {
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 5%;
  max-width: 36rem;
  margin: 2.5rem auto 0;
  border-bottom: 10px solid var(--foreground);
  padding: 0 0.75rem;
}
.spine {
  position: relative;
  min-width: 0;
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: transform 0.18s ease;
}
.spine img {
  width: 100%;
  height: auto;
}
.binding {
  position: absolute;
  inset: 11% 5%;
  display: flex;
  justify-content: center;
}
.binding span {
  writing-mode: vertical-rl;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.title {
  font-family: var(--font-heading);
  font-size: clamp(0.8rem, 4.2cqw, 1.5rem);
}
.author {
  font-size: clamp(0.6rem, 2.5cqw, 0.875rem);
}
.spine:focus-visible {
  outline: 3px solid var(--foreground);
  outline-offset: 5px;
}
@media (hover: hover) {
  .spine:hover {
    transform: translateY(-8px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .spine {
    transition: none;
  }
  .placeholder {
    animation: none;
  }
}
</style>
