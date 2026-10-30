<script setup>
import { ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import BookSpine from '@/components/books/BookSpine.vue';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';

const props = defineProps({
  books: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
});
const emit = defineEmits(['retry', 'preview']);
const featuredBooks = ref([]);
const pinnedBook = ref(null);

//@sree-sanjana06 > randomly choose up to five books without changing the original list
function randomiseBooks() {
  const shuffled = [...props.books];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  featuredBooks.value = shuffled.slice(0, 5);
  pinnedBook.value = null;
}
watch(() => props.books, randomiseBooks, { immediate: true });

function toggleSpine(book) {
  pinnedBook.value = pinnedBook.value?.id === book.id ? null : book;
}
function getAuthors(book) {
  return Array.isArray(book?.authors) && book.authors.length
    ? book.authors.join(', ') : 'Unknown author';
}
</script>

<template>
  <section class="space-y-5 rounded-xl border bg-card p-6">
    <!--@sree-sanjana06 > bookshelf heading and randomise control-->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="space-y-1">
        <h2 class="font-heading text-3xl">Available on the shelf</h2>
        <p class="text-sm text-muted-foreground">Five books looking for a new home.</p>
      </div>
      <Button variant="outline" :disabled="loading || books.length < 2" @click="randomiseBooks">
        Random
      </Button>
    </div>

    <p v-if="loading" class="py-10 text-center text-muted-foreground">Loading available books...</p>
    <div v-else-if="error" class="space-y-3 py-6 text-center">
      <p class="text-muted-foreground">{{ error }}</p>
      <Button variant="outline" @click="emit('retry')">Try Again</Button>
    </div>
    <p v-else-if="featuredBooks.length === 0" class="py-10 text-center text-muted-foreground">
      There are no available books at the moment.
    </p>

    <!--@sree-sanjana06 > reuse BookSpine and show small preview on hover/click-->
    <div v-else>
      <div class="flex min-h-[23rem] items-end justify-center gap-2 px-3 pt-10 sm:gap-3" aria-label="Available books">
        <div v-for="(book, index) in featuredBooks" :key="book.id"
          class="group relative flex shrink-0 items-end hover:z-40 focus-within:z-40"
          @mouseleave="pinnedBook = null">
          <BookSpine :book="book" :index="index" @select="toggleSpine" />
          <div class="absolute bottom-full left-1/2 z-30 w-72 -translate-x-1/2 pb-2"
            :class="pinnedBook?.id === book.id ? 'block' : 'hidden group-hover:block group-focus-within:block'">
            <div class="space-y-3 rounded-xl border bg-card p-4 shadow-xl">
              <p class="text-sm text-muted-foreground">From our shelves</p>
              <AppBookIdentity :title="book.title" :author="getAuthors(book)"
                :cover="book.coverurl" coverClass="w-20" />
              <p v-if="book.description" class="line-clamp-2 text-sm text-muted-foreground">
                {{ book.description }}
              </p>
              <div class="border-t pt-3">
                <Button variant="outline" class="w-full" @click.stop="emit('preview', book)">
                  Click to preview
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!--@sree-sanjana06 > shelf base and book count-->
      <div class="h-3 rounded-md bg-foreground"></div>
      <p class="mt-3 text-center text-sm text-muted-foreground">
        Showing {{ featuredBooks.length }} available {{ featuredBooks.length === 1 ? 'book' : 'books' }}.
        Hover over a book to preview it.
      </p>
    </div>
  </section>
</template>
