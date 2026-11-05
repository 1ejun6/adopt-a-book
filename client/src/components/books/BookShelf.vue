<script setup>
import bookspine from '@/assets/bookspine.svg';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';

const props = defineProps({
  books: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  savedIds: { type: Set, default: () => new Set() },
});
const colourClasses = ['bg-badge-rose', 'bg-badge-neutral', 'bg-badge-amber', 'bg-badge-green', 'bg-primary'];
defineEmits(['select']);
</script>

<template>
  <!--@ChitanyaBharathi > books in a row > bottom border is shelf-->
  <div v-if="props.loading"
    class="@container mx-auto grid w-full max-w-xl grid-cols-5 gap-[3%] border-b-10" role="status" aria-label="Loading books">
    <div v-for="index in 5" :key="index" class="rounded-[6px] bg-border/60"
      aria-hidden="true">
      <img :src="bookspine" alt="" width="80" height="280" class="w-full" />
    </div>
  </div>
  <div v-else-if="!props.books.length"><slot name="empty">No books available yet</slot></div>
  <div v-else-if="props.books.length"
    class="@container mx-auto grid w-full max-w-xl grid-cols-5 gap-[3%] border-b-10">
    <button type="button" v-for="(book, index) in props.books" :key="book.id" :class="colourClasses[index % colourClasses.length]"
      class="book-spine relative min-w-0 rounded-[6px]" :aria-label="`${book.title} by ${(book.authors || []).join(', ')}${savedIds.has(book.id) ? ', saved' : ''}`" aria-haspopup="dialog"
      @click="$emit('select', book)">
      <img :src="bookspine" alt="" width="80" height="280" class="w-full" />
      <!--@ChitanyaBharathi > title & author overlay spine between its binding lines-->
      <div class="absolute inset-x-[5%] top-[10%] bottom-[10%] flex justify-center">
        <!--@1ejun6 > leaves extra space above and below text-->
        <span :title="(book.authors || []).join(', ')"
          class="truncate text-[clamp(0.625rem,2.5cqw,0.875rem)] [writing-mode:vertical-rl]">{{ (book.authors ||
            []).join(', ') }}</span>
        <span :title="book.title" class="font-heading truncate text-[clamp(0.75rem,4.2cqw,1.5rem)] [writing-mode:vertical-rl]">{{
          book.title }}</span>
      </div>
      <!--@1ejun6 > bottom-10 lifts 224px-wide > left-1/2 & -translate-x-1/2 center it over spine-->
      <div aria-hidden="true"
        class="book-preview absolute bottom-10 left-1/2 w-32 sm:w-50 -translate-x-1/2 border bg-background p-2.5 rounded-md text-left space-y-2.5">
        <AppBookIdentity :title="book.title" :author="(book.authors || []).join(', ')" :cover="book.coverurl"
          cover-class="w-8" />
        <p class="line-clamp-2 text-sm">{{ book.description }}</p>
      </div>
    </button>
  </div>
</template>

<style scoped>
.book-preview { display: none; }
.book-spine:first-child .book-preview { left: 0; transform: none; }
.book-spine:last-child .book-preview { left: auto; right: 0; transform: none; }

/*@1ejun6 > touch opens details directly > hover previews only on devices with a mouse */
@media (hover: hover) and (pointer: fine) {
  .book-preview {
    display: block;
    visibility: hidden;
  }

  .book-spine:is(:hover, :focus-visible) {
    z-index: 10;
  }

  .book-spine:is(:hover, :focus-visible) .book-preview {
    visibility: visible;
  }
}
</style>
