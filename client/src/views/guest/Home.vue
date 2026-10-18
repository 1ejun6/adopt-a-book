<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { mockbooks } from '@/data/mockbooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppFilters from '@/components/shared/AppFilters.vue';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';
import BookSpine from '@/components/books/BookSpine.vue';

const search = ref('');
const genre = ref('all');
const selected = ref(null);

//@ChitanyaBharathi > all genres for the dropdown
const genres = computed(() => [...new Set(mockbooks.flatMap((book) => book.subjects))].sort());

//@ChitanyaBharathi > books that match the search and genre
const shown = computed(() => {
  const term = search.value.trim().toLowerCase();
  return mockbooks.filter((book) => {
    const matchesTerm =
      book.title.toLowerCase().includes(term) ||
      book.authors.some((author) => author.toLowerCase().includes(term));
    const matchesGenre = genre.value === 'all' || book.subjects.includes(genre.value);
    return matchesTerm && matchesGenre;
  });
});

//@ChitanyaBharathi > tap to select > tap again to unselect
function toggle(book) {
  selected.value = selected.value?.id === book.id ? null : book;
}
</script>

<template>
  <main class="mx-auto w-full max-w-7xl space-y-5">
    <h1>Browse books</h1>
    <p class="text-muted-foreground">Preview a donated book. Create an account only when you're ready to request it.</p>

    <!--@ChitanyaBharathi > search and genre filter-->
    <AppFilters v-model:search="search" v-model:genre="genre" :genres="genres" searchPlaceholder="Search title or author..." />

    <div class="flex justify-between border-b pb-2.5">
      <h2>Available on the shelf</h2>
      <p class="text-sm text-muted-foreground">{{ shown.length }} books · tap a spine to preview</p>
    </div>

    <!--@ChitanyaBharathi > items-end keeps the books on one line-->
    <div class="flex flex-wrap items-end justify-center gap-y-10">
      <!--@ChitanyaBharathi > bottom border is the shelf plank-->
      <div v-for="(book, index) in shown" :key="book.id" class="border-b-10 border-[#e8c9a9] px-1 pt-5">
        <BookSpine :book="book" :index="index" :selected="book.id === selected?.id" @select="toggle" />
      </div>
      <p v-if="!shown.length">No books match that search yet.</p>
    </div>

    <!--@ChitanyaBharathi > book details under the shelf-->
    <section v-if="selected" class="carddupe mx-auto max-w-3xl">
      <div class="flex items-center justify-between">
        <AppBookIdentity :title="selected.title" :author="selected.authors.join(', ')" />
        <AppStatusBadge :status="selected.status" />
      </div>
      <p>{{ selected.description }}</p>
      <div class="flex gap-2.5">
        <Badge v-for="subject in selected.subjects" :key="subject">{{ subject }}</Badge>
      </div>
      <p class="text-sm text-muted-foreground">Pickup at {{ selected.pickup.area }} · published {{ selected.publicationyear }}</p>
      <Button as-child class="w-full">
        <RouterLink to="/register">Create account to request</RouterLink>
      </Button>
      <Button as-child variant="outline" class="w-full">
        <RouterLink to="/login">I already have an account</RouterLink>
      </Button>
    </section>
  </main>
</template>
