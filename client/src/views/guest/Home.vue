<script setup>
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import bookspine from '@/assets/bookspine.svg';

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
      <div v-for="book in books" :key="book.title" :style="{ backgroundColor: book.colour }"
           class="relative rounded-[6px] hover:-translate-y-2.5 transition" @click="selected = book">
        <img :src="bookspine" alt="" width="80" height="280" />
        <!--@ChitanyaBharathi > vertical-rl > text reads downwards-->
        <span class="absolute top-[35px] left-[36px] text-left text-[20px] leading-none [writing-mode:vertical-rl]">{{ book.title }}</span>
        <span class="absolute top-[35px] left-[16px] text-left text-[12px] leading-none [writing-mode:vertical-rl]">{{ book.author }}</span>
      </div>
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