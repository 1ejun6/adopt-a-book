<script setup>
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppToolbar from '@/components/shared/AppToolbar.vue';

//@sree-sanjana06 > connect filters to BrowseBooks.vue using two-way binding
const search = defineModel('search', { type: String, default: '' });
const status = defineModel('status', { type: String, default: 'all' });
const subject = defineModel('subject', { type: String, default: '' });
const sort = defineModel('sort', { type: String, default: 'title' });

//@sree-sanjana06 > tell BrowseBooks.vue when customer clears filters
const emit = defineEmits(['clear']);
</script>

<template>
  <!--@sree-sanjana06 > reuse existing shared toolbar for search and filters-->
  <AppToolbar v-model:search="search"
    searchPlaceholder="Search by title, author or ISBN...">

    <template #filters>
      <!--@sree-sanjana06 > filter by book availability-->
      <select v-model="status" aria-label="Availability"
        class="rounded-lg border bg-background p-2.5 text-sm">
        <option value="all">All availability</option>
        <option value="available">Available</option>
        <option value="reserved">Reserved</option>
        <option value="adopted">Adopted</option>
      </select>

      <!--@sree-sanjana06 > filter books by subject-->
      <Input v-model="subject"
        placeholder="Subject, e.g. Fiction"
        aria-label="Subject"
        class="w-44" />

      <!--@sree-sanjana06 > sort books by title, author or newest-->
      <select v-model="sort" aria-label="Sort books"
        class="rounded-lg border bg-background p-2.5 text-sm">
        <option value="title">Title A–Z</option>
        <option value="author">Author A–Z</option>
        <option value="newest">Newest</option>
      </select>
    </template>

    <!--@sree-sanjana06 > emit clear event to reset filters in parent-->
    <template #actions>
      <Button variant="outline" @click="emit('clear')">
        Clear filters
      </Button>
    </template>
  </AppToolbar>
</template>
