<script setup>
import { ref } from 'vue';
import bookspine from '@/assets/bookspine.svg';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import BookPreviewDialog from '@/components/guest/BookPreviewDialog.vue';

const props = defineProps({
  books: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
});
const colourClasses = ['bg-badge-rose', 'bg-badge-neutral', 'bg-badge-amber', 'bg-badge-green', 'bg-primary'];
const selectedbook = ref(null);
const dialogopen = ref(false);

//@1ejun6 > reuse cached shelf data for details > no extra book request
function openbook(book) {
  selectedbook.value = book;
  dialogopen.value = true;
}
</script>

<template>
  <!--@ChitanyaBharathi > books in a row > bottom border is shelf-->
  <div v-if="props.isLoading" class="grid grid-cols-5 gap-10 border-b-10" role="status" aria-label="loading books">
    <div v-for="index in 5" :key="index" class="animate-pulse rounded-[6px] bg-border/60 motion-reduce:animate-none" aria-hidden="true">
      <img :src="bookspine" alt="" width="80" height="280" class="w-full" />
    </div>
  </div>
  <p v-else-if="!props.books.length">no books available yet</p>
  <div v-else-if="props.books.length" class="grid grid-cols-5 gap-10 border-b-10">
    <div v-for="(book, index) in props.books" :key="book.id" :class="colourClasses[index % colourClasses.length]"
      class="book-spine relative rounded-[6px] hover:-translate-y-2.5" role="button" tabindex="0"
      :aria-label="`view ${book.title}`" aria-haspopup="dialog" @click="openbook(book)"
      @keydown.enter.prevent="openbook(book)" @keydown.space.prevent="openbook(book)">
      <img :src="bookspine" alt="" width="80" height="280" class="w-full" />
      <!--@ChitanyaBharathi > title & author overlay spine between its binding lines-->
      <div class="absolute inset-x-[5%] top-[10%] bottom-[10%] flex justify-center">
        <!--@1ejun6 > leaves extra space above and below text-->
        <span :title="(book.authors || []).join(', ')" class="truncate text-sm [writing-mode:vertical-rl]">{{ (book.authors || []).join(', ') }}</span>
        <h2 :title="book.title" class="truncate [writing-mode:vertical-rl]">{{ book.title }}</h2>
      </div>
      <!--@1ejun6 > bottom-10 lifts 224px-wide > left-1/2 & -translate-x-1/2 center it over spine-->
      <div
        class="book-preview absolute bottom-10 left-1/2 w-50 -translate-x-1/2 border bg-background p-2.5 rounded-md text-left space-y-2.5">
        <AppBookIdentity :title="book.title" :author="(book.authors || []).join(', ')" :cover="book.coverurl" cover-class="w-8" />
        <p class="line-clamp-2 text-sm">{{ book.description }}</p>
      </div>
    </div>
  </div>

  <BookPreviewDialog v-model:open="dialogopen" :book="selectedbook" />
</template>

<style scoped>
.book-preview {
  visibility: hidden;
}

/*@1ejun6 > put active spine in front so nearby books cannot cover its preview*/
.book-spine:hover, .book-spine:focus-within {
  z-index: 10;
}

/*@1ejun6 > show only preview belonging to hovered \ keyboard focused spine*/
.book-spine:hover .book-preview, .book-spine:focus-within .book-preview {
  visibility: visible;
}
</style>
