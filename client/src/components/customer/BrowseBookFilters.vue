<script setup>
import { reactive, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppToolbar from '@/components/shared/AppToolbar.vue';

//@1ejun6 > filter controls own URL syncing & search debounce
const emit = defineEmits(['pending', 'refresh']);
const route = useRoute();
const router = useRouter();
const querytext = value => typeof value === 'string' ? value : '';
const querysort = () => ['title', 'author', 'newest'].includes(route.query.sort) ? route.query.sort : 'title';
const filters = reactive({ search: querytext(route.query.search), subject: querytext(route.query.subject), sort: querysort() });
let searchtimer;

//@1ejun6 > keep defaults out of URL > preserve unrelated query parameters
function updatequery(updates, replace = false) {
  const query = { ...route.query };
  for (const [key, value] of Object.entries(updates)) {
    if (!value || (key === 'sort' && value === 'title') || (key === 'page' && Number(value) === 1)) delete query[key];
    else query[key] = String(value);
  }
  if (['search', 'subject', 'sort', 'page'].every(key => query[key] === route.query[key])) return;
  return router[replace ? 'replace' : 'push']({ query });
}

//@1ejun6 > typing updates URL after a short pause > cancel obsolete work immediately
watch(() => filters.search, value => {
  const pending = !!searchtimer;
  clearTimeout(searchtimer);
  searchtimer = undefined;
  if (value.trim() === querytext(route.query.search)) {
    if (pending) emit('refresh');
    return;
  }
  emit('pending');
  searchtimer = setTimeout(() => {
    searchtimer = undefined;
    updatequery({ search: value.trim(), page: 1 }, true);
  }, 300);
});

watch(() => [filters.subject, filters.sort], () => {
  if (filters.subject === querytext(route.query.subject) && filters.sort === querysort()) return;
  clearTimeout(searchtimer);
  searchtimer = undefined;
  updatequery({ search: filters.search.trim(), subject: filters.subject, sort: filters.sort, page: 1 });
});

watch(() => [route.query.search, route.query.subject, route.query.sort, route.query.page], () => {
  clearTimeout(searchtimer);
  searchtimer = undefined;
  Object.assign(filters, { search: querytext(route.query.search), subject: querytext(route.query.subject), sort: querysort() });
});

onBeforeUnmount(() => clearTimeout(searchtimer));

//@sree-sanjana06 > genre options based on existing book categories
import genres from '../../../../shared/genres.json';
</script>

<template>
  <!--@sree-sanjana06 > shared toolbar for search and filters-->
  <AppToolbar v-model:search="filters.search" searchId="browse-search" searchPlaceholder="Search by title, author or ISBN...">

    <template #filters>
      <!--@sree-sanjana06 > choose a genre instead of typing it-->
      <label for="browse-genre" class="sr-only">Genre</label>
      <select id="browse-genre" v-model="filters.subject" class="min-h-11 w-full rounded-lg border p-2.5 text-sm sm:w-44">
        <option value="">All</option>
        <option v-for="genre in genres" :key="genre" :value="genre">{{ genre }}</option>
      </select>

      <!--@sree-sanjana06 > sort available books-->
      <label for="browse-sort" class="sr-only">Sort by</label>
      <select id="browse-sort" v-model="filters.sort" class="min-h-11 rounded-lg border p-2.5 text-sm">
        <option value="title">Title A–Z</option>
        <option value="author">Author A–Z</option>
        <option value="newest">Newest</option>
      </select>
    </template>

  </AppToolbar>
</template>
