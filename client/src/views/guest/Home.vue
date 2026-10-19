<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';

const cover = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;

//@ChitanyaBharathi > books on the shelf
const books = [
  { title: 'Little Women', author: 'Louisa May Alcott', isbn: '9780143106654', colour: '#fbe4df', description: 'Four sisters grow up during the Civil War.' },
  { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', colour: '#f3e1cc', description: 'A witty look at manners, marriage and first impressions.' },
  { title: 'Frankenstein', author: 'Mary Shelley', isbn: '9780141439471', colour: '#f5e9b8', description: 'A scientist creates life and lives with the consequences.' },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227', colour: '#f2d6c9', description: 'Bilbo Baggins is swept into a quest for dragon gold.' },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', colour: '#e9dcf2', description: 'A childhood in Alabama and a trial that tests a town.' },
];

const selected = ref(null);
</script>

<template>
  <main class="mx-auto space-y-5 text-center">
    <p>From our shelves to yours</p>
    <h1 class="text-6xl">Different shelves.<br>Shared stories.</h1>
    <p>Which one feels like your next chapter?</p>

    <!--@ChitanyaBharathi > books in a row > bottom border is the shelf-->
    <div class="flex justify-center gap-10 border-b-10 border-[#e8c9a9]">
      <!--@ChitanyaBharathi > one svg spine per book > lifts on hover-->
      <svg v-for="book in books" :key="book.title" width="80" height="280"
           class="hover:-translate-y-2.5 transition" @click="selected = book">
        <rect width="80" height="280" rx="6" :fill="book.colour" stroke="#633b22" stroke-width="2" />
        <!--@ChitanyaBharathi > thin double bands at top and bottom > classic spine look-->
        <g fill="none" stroke="#633b22" stroke-width="1" opacity="0.5">
          <rect y="14" width="80" height="4" />
          <rect y="262" width="80" height="4" />
        </g>
        <!--@ChitanyaBharathi > vertical-rl > text reads downwards-->
        <text x="46" y="35" font-size="20" writing-mode="vertical-rl">{{ book.title }}</text>
        <text x="22" y="35" font-size="12" writing-mode="vertical-rl">{{ book.author }}</text>
      </svg>
    </div>

    <!--@ChitanyaBharathi > details of the picked book-->
    <section v-if="selected" class="carddupe">
      <AppBookIdentity :title="selected.title" :author="selected.author" :cover="cover(selected.isbn)" />
      <p>{{ selected.description }}</p>
      <!--@ChitanyaBharathi > as-child > the link becomes the button > whole button is clickable-->
      <Button as-child class="w-full">
        <RouterLink to="/register">Create account to adopt</RouterLink>
      </Button>
    </section>
    <p v-else>Pick a spine to open a book.</p>
  </main>
</template>