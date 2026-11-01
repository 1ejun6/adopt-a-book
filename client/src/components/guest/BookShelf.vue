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
  <div v-if="props.isLoading" class="@container mx-auto grid max-w-[clamp(17.5rem,59vw,36rem)] grid-cols-5 gap-[5%] border-b-10" role="status">
    <div v-for="index in 5" :key="index" class="animate-pulse rounded-[6px] bg-border/60 motion-reduce:animate-none" aria-hidden="true">
      <img :src="bookspine" alt="" width="80" height="280" class="w-full" />
    </div>
  </div>
  <p v-else-if="!props.books.length">no books available yet</p>
  <div v-else-if="props.books.length" class="@container mx-auto grid max-w-[clamp(17.5rem,59vw,36rem)] grid-cols-5 gap-[5%] border-b-10">
    <div v-for="(book, index) in props.books" :key="book.id" :class="colourClasses[index % colourClasses.length]" class="book-spine relative min-w-0 cursor-pointer rounded-[6px]" role="button" tabindex="0" aria-haspopup="dialog" @click="openbook(book)" @keydown.enter.prevent="openbook(book)" @keydown.space.prevent="openbook(book)">
      <img :src="bookspine" alt="" width="80" height="280" class="w-full" />
      <!--@ChitanyaBharathi > title & author overlay spine between its binding lines-->
      <div class="absolute inset-x-[5%] top-[10%] bottom-[10%] flex justify-center">
        <!--@1ejun6 > leaves extra space above and below text-->
        <span :title="(book.authors || []).join(', ')" class="truncate text-[clamp(0.625rem,2.5cqw,0.875rem)] [writing-mode:vertical-rl]">{{ (book.authors || []).join(', ') }}</span>
        <h2 :title="book.title" class="truncate text-[clamp(0.75rem,4.2cqw,1.5rem)] [writing-mode:vertical-rl]">{{ book.title }}</h2>
      </div>
      <!--@1ejun6 > bottom-10 lifts 224px-wide > left-1/2 & -translate-x-1/2 center it over spine-->
      <div aria-hidden="true" class="book-preview absolute bottom-10 left-1/2 w-50 -translate-x-1/2 border bg-background p-2.5 rounded-md text-left space-y-2.5">
        <AppBookIdentity :title="book.title" :author="(book.authors || []).join(', ')" :cover="book.coverurl" cover-class="w-8" />
        <p class="line-clamp-2 text-sm">{{ book.description }}</p>
      </div>
    </div>
  </div>

  <BookPreviewDialog v-model:open="dialogopen" :book="selectedbook" />
</template>

<style scoped>
.book-preview {
  display: none;
}

/*@1ejun6 > touch opens details directly > hover previews only on devices with a mouse */
@media (hover: hover) and (pointer: fine) {
  .book-preview {
    display: block;
    visibility: hidden;
  }

  .book-spine:is(:hover, :focus-visible) {
    z-index: 10;
    transform: translateY(-0.625rem);
  }

  .book-spine:is(:hover, :focus-visible) .book-preview {
    visibility: visible;
  }
}
</style>
