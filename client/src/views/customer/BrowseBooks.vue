<script setup>
import { useVisibleRefresh } from '@/composables/useVisibleRefresh';
import AppPage from '@/components/shared/AppPage.vue';
import { getPageCount } from '@/lib/utils';
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { toast } from 'vue-sonner';
import AppLocationFilter from '@/components/shared/AppLocationFilter.vue';
import AppPagination from '@/components/shared/AppPagination.vue';
import CustomerBookList from '@/components/customer/CustomerBookList.vue';
import BrowseBookFilters from '@/components/customer/BrowseBookFilters.vue';
import { Button } from '@/components/ui/button';

// Catalogue state.
const books = ref([]);
const locationFilter = ref(null);
const filterReset = ref(0);
const locationReset = ref(0);

//@sree-sanjana06 > loading and error states
const loading = ref(false);
const loadError = ref('');

//@sree-sanjana06 > search, genre and sorting filters for Browse Books
const route = useRoute();
const router = useRouter();
const querytext = value => typeof value === 'string' ? value : '';
const querypage = () => {
  const value = Number(querytext(route.query.page));
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
};
const filters = computed(() => ({ search: querytext(route.query.search), subject: querytext(route.query.subject), mrtstationids: querytext(route.query.mrtstationids), sort: ['title', 'author', 'newest'].includes(route.query.sort) ? route.query.sort : 'title' }));

//@sree-sanjana06 > pagination and saved-book lookup
const page = ref(querypage());
const pageSize = 16;
const total = ref(0);
const pageCount = computed(() => getPageCount(total.value, pageSize));
let requestId = 0;
let controller;

//@1ejun6 > filters own search URL updates > page changes preserve those filters
function setpage(value, replace = false) {
  const query = { ...route.query };
  if (value === 1) delete query.page;
  else query.page = String(value);
  return router[replace ? 'replace' : 'push']({ query });
}

function applylocation(result) {
  const query = { ...route.query };
  delete query.page;
  if (result) query.mrtstationids = result.stations.map(station => station.id).join(',');
  else delete query.mrtstationids;
  router.push({ query });
}

//@lee-hlmilk > reset URL filters in one navigation > remount controls to cancel pending search/location lookups
async function resetFilters(searchOnly = false) {
  const query = { ...route.query };
  for (const key of searchOnly ? ['search', 'page'] : ['search', 'subject', 'sort', 'mrtstationids', 'page']) delete query[key];
  filterReset.value++;
  if (!searchOnly) locationReset.value++;
  await router.push({ query });
  document.getElementById('browse-search')?.focus();
}

function cancelbooks() {
  requestId++;
  controller?.abort();
}

//@sree-sanjana06 > fetch matching books using existing catalogue API
async function fetchBooks() {
  cancelbooks();
  const id = requestId;
  const request = new AbortController();
  controller = request;
  loading.value = true;
  loadError.value = '';

  try {
    const response = await api('/books', {
      method: 'GET',
      signal: request.signal,
      query: {
        page: page.value,
        limit: pageSize,
        search: filters.value.search.trim(),
        status: 'available',
        subject: filters.value.subject.trim() || undefined,
        sort: filters.value.sort,
        mrtstationids: Object.hasOwn(route.query, 'mrtstationids') ? filters.value.mrtstationids : undefined
      }
    });

    //@sree-sanjana06 > ignore outdated requests when filters change quickly
    if (id !== requestId) return;

    total.value = Number(response.total ?? 0);

    //@sree-sanjana06 > correct page if results now have fewer pages
    if (page.value > pageCount.value) {
      await setpage(pageCount.value, true);
      return;
    }

    books.value = Array.isArray(response.books) ? response.books : [];
  } catch (error) {
    if (id !== requestId || request.signal.aborted) return;
    loadError.value = error.message;
    toast.error(error.message, { duration: Infinity, closeButton: true, action: { label: 'retry', onClick: fetchBooks } });
    books.value = [];
    total.value = 0;
  } finally {
    if (id === requestId) loading.value = false;
  }
}

watch(page, value => {
  if (value !== querypage()) setpage(value);
});

//@1ejun6 > reload & browser navigation restore controls from URL before fetching
watch(() => [route.query.search, route.query.subject, route.query.sort, route.query.page, route.query.mrtstationids], () => {
  if (route.name !== 'customerBooks') return;
  page.value = querypage();
  fetchBooks();
}, { immediate: true });

onBeforeUnmount(cancelbooks);
useVisibleRefresh(fetchBooks, { busy: () => loading.value });
</script>

<template>
  <AppPage class="space-y-8">
    <header class="space-y-2 text-center">
      <h1 class="text-4xl">Find your next read</h1>
      <p class="text-muted-foreground text-sm">a shared collection a new home for every book</p>
    </header>

    <!--@sree-sanjana06 > reusable customer filters built with AppToolbar-->
    <BrowseBookFilters :key="filterReset" @pending="cancelbooks(); loading = true" @refresh="fetchBooks" />

    <div class="space-y-2.5">
      <AppLocationFilter :key="locationReset" ref="locationFilter" @change="applylocation" />
      <button v-if="Object.hasOwn(route.query, 'mrtstationids')" type="button" class="text-sm underline"
        @click="locationFilter?.clear()">
        clear location filter
      </button>
    </div>

    <p v-if="!loadError && !loading" class="text-sm text-muted-foreground" role="status">{{ total }} books found</p>

    <p v-if="loadError" role="alert">{{ loadError }} <button class="underline min-h-11" :disabled="loading" @click="fetchBooks">Retry books</button></p>
    <section v-else-if="!loading && !books.length" class="space-y-5 rounded-xl border p-5" aria-labelledby="browse-empty-heading">
      <h2 id="browse-empty-heading">No matching books</h2>
      <p>No books match your current search and filters. Try a broader search or remove a filter.</p>
      <div class="flex flex-wrap gap-2.5">
        <Button v-if="filters.search" variant="outline" @click="resetFilters(true)">Clear search</Button>
        <Button variant="outline" @click="resetFilters()">Reset all filters</Button>
      </div>
    </section>
    <CustomerBookList :books="books" :loading="loading && !loadError" />

    <!--@sree-sanjana06 > existing pagination component-->
    <AppPagination v-if="!loadError && total > 0" v-model:page="page" itemLabel="books" :total="total"
      :visibleCount="books.length" :pageSize="pageSize" :loading="loading" :disabled="loading" />
  </AppPage>
</template>
