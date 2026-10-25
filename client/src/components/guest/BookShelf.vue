<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import bookspine from '@/assets/bookspine.svg';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';

const books = [
  { title: 'Little Women', author: 'Louisa May Alcott', isbn: '9780147514011', description: 'The four March sisters grow up together in this story of family, friendship, and finding their own paths.' },
  { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', description: 'Elizabeth Bennet and Mr. Darcy learn to look beyond first impressions in Jane Austen’s classic novel.' },
  { title: 'Frankenstein', author: 'Mary Shelley', isbn: '9780486282114', description: 'Victor Frankenstein and his creation face the consequences of ambition and isolation.' },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227', description: 'Bilbo Baggins leaves home for an unexpected adventure with a company of dwarves.' },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780060935467', description: 'Scout Finch looks back on childhood, justice, and the people who shaped her Alabama town.' },
];

const colourClasses = ['bg-badge-rose', 'bg-badge-neutral', 'bg-badge-amber', 'bg-badge-green', 'bg-primary'];
const spineClasses = books.map(() => colourClasses[Math.floor(Math.random() * colourClasses.length)]);
const selected = ref(null);
const cover = isbn => `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-S.jpg`;
</script>

<template>
  <!--@ChitanyaBharathi > books in a row > bottom border is shelf-->
  <div class="grid grid-cols-5 gap-10 border-b-10">
    <div v-for="(book, index) in books" :key="book.title" :class="spineClasses[index]"
      class="book-spine relative rounded-[6px] hover:-translate-y-2.5" role="button"
      @click="selected = book" @keydown.enter="selected = book" @keydown.space.prevent="selected = book">
      <img :src="bookspine" alt="" width="80" height="280" class="w-full" />
      <!--@ChitanyaBharathi > title & author overlay spine between its binding lines-->
      <div class="absolute inset-x-[5%] top-[10%] bottom-[10%] flex justify-center">
        <!--@1ejun6 > leaves extra space above and below text-->
        <span :title="book.author" class="truncate text-sm [writing-mode:vertical-rl]">{{ book.author }}</span>
        <h2 :title="book.title" class="truncate [writing-mode:vertical-rl]">{{ book.title }}</h2>
      </div>
      <!--@1ejun6 > bottom-10 lifts 224px-wide > left-1/2 & -translate-x-1/2 center it over spine-->
      <div
        class="book-preview absolute bottom-10 left-1/2 w-50 -translate-x-1/2 bg-background p-2.5 rounded-md text-left space-y-2.5">
        <AppBookIdentity :title="book.title" :author="book.author" :cover="cover(book.isbn)" cover-class="w-8" />
        <p class="line-clamp-2 text-sm">{{ book.description }}</p>
        <p class="text-sm"><RouterLink to="/register">click here to preview</RouterLink></p>
      </div>
    </div>
  </div>
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
