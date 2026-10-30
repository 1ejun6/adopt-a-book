<script setup>
import { Button } from '@/components/ui/button';
import AppToolbar from '@/components/shared/AppToolbar.vue';

//@sree-sanjana06 > connect filters to BrowseBooks.vue
const search = defineModel('search', { type: String, default: '' });
const subject = defineModel('subject', { type: String, default: '' });
const sort = defineModel('sort', { type: String, default: 'title' });

const emit = defineEmits(['clear']);

//@sree-sanjana06 > genre options based on existing book categories
const genres = ['Adventure','Art','Biography','Business','Children', 'Comics','Cooking', 'Fantasy','Fiction','Health', 'Historical fiction','History','Horror','Mystery','Nonfiction','Philosophy','Poetry','Religion','Romance','Science','Science fiction','Self-help','Technology','Thriller','Travel','Young adult'];
</script>

<template>
  <!--@sree-sanjana06 > shared toolbar for search and filters-->
  <AppToolbar
    v-model:search="search"
    searchPlaceholder="Search by title, author or ISBN...">

    <template #filters>
      <!--@sree-sanjana06 > choose a genre instead of typing it-->
      <select v-model="subject" aria-label="Filter by genre" class="w-44 rounded-lg border bg-background p-2.5 text-sm">
        <option value="">All genres</option>
        <option
          v-for="genre in genres"
          :key="genre"
          :value="genre">
          {{ genre }}
        </option>
      </select>

      <!--@sree-sanjana06 > sort available books-->
      <select v-model="sort" aria-label="Sort books" class="rounded-lg border bg-background p-2.5 text-sm">
        <option value="title">Title A–Z</option>
        <option value="author">Author A–Z</option>
        <option value="newest">Newest</option>
      </select>
    </template>

    <!--@sree-sanjana06 > reset search, genre and sorting-->
    <template #actions>
      <Button variant="outline" @click="emit('clear')">
        Clear filters
      </Button>
    </template>

  </AppToolbar>
</template>
