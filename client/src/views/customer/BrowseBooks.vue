<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();

// Catalogue state.
const books = ref([]);
const filterReset = ref(0);
const locationReset = ref(0);

//@sree-sanjana06 > loading and error states
const loading = ref(false);
const loadError = ref('');

//@sree-sanjana06 > search, genre and sorting filters for Browse Books
const route = useRoute();
const router = useRouter();
const rememberedQueries = {};
const rememberedLocations = ref(new Map());
const genreGroup = computed({
  get: () => route.query.genregroup === 'other' ? 'other' : 'my',
  set: value => router.push({ query: { ...(rememberedQueries[value] || { ...route.query, page: undefined }), genregroup: value } }),
});
watch(() => route.query, query => { rememberedQueries[genreGroup.value] = { ...query }; }, { immediate: true });
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
const genreCounts = ref({ my: null, other: null });
const tabResults = new Map();
let displayedResultKey;
const pageCount = computed(() => getPageCount(total.value, pageSize));
let requestId = 0;
let controller;
let emptyToastId, lastEmptyKey;

//@1ejun6 > filters own search URL updates > page changes preserve those filters
function setpage(value, replace = false) {
  const query = { ...route.query };
  if (value === 1) delete query.page;
  else query.page = String(value);
  return router[replace ? 'replace' : 'push']({ query });
}

const selectedLocation = computed(() => Object.hasOwn(route.query, 'mrtstationids') ? rememberedLocations.value.get(filters.value.mrtstationids) || null : null);
function applylocation(result) {
  if (result) rememberedLocations.value.set(result.stations.map(station => station.id).join(','), result);
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

function dismissEmptyToast() {
  if (emptyToastId !== undefined) { toast.dismiss(emptyToastId); emptyToastId = undefined; }
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
    const currentGroup = genreGroup.value;
    const otherGroup = currentGroup === 'my' ? 'other' : 'my';
    const resultKey = JSON.stringify([auth.user?.id, auth.user?.preferredgenres, currentGroup, filters.value, page.value]);
    if (resultKey !== displayedResultKey) {
      const cached = tabResults.get(currentGroup);
      books.value = cached?.key === resultKey ? cached.books : [];
      total.value = cached?.key === resultKey ? cached.total : 0;
      displayedResultKey = resultKey;
    }
    const query = {
      search: filters.value.search.trim(),
      status: 'available',
      subject: filters.value.subject.trim() || undefined,
      sort: filters.value.sort,
      mrtstationids: Object.hasOwn(route.query, 'mrtstationids') ? filters.value.mrtstationids : undefined,
    };
    // The inactive tab's count must not delay the selected tab's books.
    void api('/customer/catalogue', {
      signal: request.signal,
      query: { ...query, page: 1, genregroup: otherGroup, limit: 1 },
    }).then(response => {
      if (id === requestId) genreCounts.value[otherGroup] = Number(response.total ?? 0);
    }).catch(() => { /* Keep the previous count if this optional request fails. */ });
    const response = await api('/customer/catalogue', {
      signal: request.signal,
      query: { ...query, page: page.value, genregroup: currentGroup, limit: pageSize },
    });

    //@sree-sanjana06 > ignore outdated requests when filters change quickly
    if (id !== requestId) return;

    total.value = Number(response.total ?? 0);
    genreCounts.value[currentGroup] = total.value;

    //@sree-sanjana06 > correct page if results now have fewer pages
    if (page.value > pageCount.value) {
      await setpage(pageCount.value, true);
      return;
    }

    books.value = Array.isArray(response.books) ? response.books : [];
    tabResults.set(currentGroup, { key: resultKey, books: books.value, total: total.value });
    const emptyKey = JSON.stringify([genreGroup.value, filters.value, page.value]);
    if (books.value.length) {
      dismissEmptyToast();
      lastEmptyKey = undefined;
    } else if (emptyKey !== lastEmptyKey) {
      lastEmptyKey = emptyKey;
      dismissEmptyToast();
      emptyToastId = toast.info('No matching books', {
        description: 'Try a broader search or remove a filter.',
        duration: Infinity,
        action: { label: 'Reset filters', onClick: () => resetFilters() },
      });
    }
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
watch(() => [route.query.search, route.query.subject, route.query.sort, route.query.page, route.query.mrtstationids, route.query.genregroup, JSON.stringify(auth.user?.preferredgenres)], () => {
  if (route.name !== 'customerBooks') return;
  dismissEmptyToast();
  page.value = querypage();
  fetchBooks();
}, { immediate: true });

onBeforeUnmount(() => { dismissEmptyToast(); cancelbooks(); });
useVisibleRefresh(fetchBooks, { busy: () => loading.value });
</script>

<template>
  <AppPage class="browse-books space-y-5">
    <header class="app-page-heading text-center">
      <h1>Find Your Next Read</h1>
      <p>find a book to take home</p>
    </header>

    <Tabs v-model="genreGroup" class="gap-5">
      <TabsList aria-label="Book genres" class="adoption-tabs">
        <TabsTrigger value="my" class="gap-2.5">My genres<Badge class="min-w-8 bg-primary text-center tabular-nums">{{ genreCounts.my ?? '—' }}</Badge></TabsTrigger>
        <TabsTrigger value="other" class="gap-2.5">Other genres<Badge class="min-w-8 bg-primary text-center tabular-nums">{{ genreCounts.other ?? '—' }}</Badge></TabsTrigger>
      </TabsList>
    <TabsContent :value="genreGroup" class="space-y-5">
    <p v-if="genreGroup === 'my' && !auth.user?.preferredgenres?.length" class="text-sm">
      Choose your favourite genres in My account to see books here. Other genres includes all available books until then.
      <Button asChild variant="outline"><RouterLink :to="{ name: 'customerAccount' }"><AppIcon name="filter" />Choose genres</RouterLink></Button>
    </p>
    <!--@sree-sanjana06 > reusable customer filters built with AppToolbar-->
    <BrowseBookFilters :key="filterReset" @pending="dismissEmptyToast(); cancelbooks(); loading = true" @refresh="fetchBooks" />

    <AppLocationFilter :key="locationReset" :selection="selectedLocation"
      :active="Object.hasOwn(route.query, 'mrtstationids')" @change="applylocation" />

    <p v-if="loading && !loadError" class="sr-only" role="status">Loading books…</p>

    <p v-if="loadError" role="alert">{{ loadError }} <Button variant="outline" class="min-h-11" :disabled="loading" @click="fetchBooks" :loading="loading"><AppIcon name="refresh" /><span class="sr-only">Retry books</span></Button></p>
    <CustomerBookList :books="books" :loading="loading && !loadError" />

    <!--@sree-sanjana06 > existing pagination component-->
    <AppPagination v-if="!loadError" v-model:page="page" itemLabel="books" :total="total"
      :visibleCount="books.length" :pageSize="pageSize" :loading="loading" :disabled="loading" />
    </TabsContent>
    </Tabs>
  </AppPage>
</template>

<style scoped>
.browse-books {
  max-width: 64rem;
}
.browse-books :deep([data-slot="input"]),
.browse-books :deep(#browse-genre),
.browse-books :deep(#browse-sort) {
  background: transparent;
}
</style>
