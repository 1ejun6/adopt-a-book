<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { toast } from 'vue-sonner';
import AppPagination from '@/components/shared/AppPagination.vue';
import BrowseBookFilters from '@/components/customer/BrowseBookFilters.vue';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';
import CustomerBookCard from '@/components/customer/CustomerBookCard.vue';

//@sree-sanjana06 > catalogue, watchlist and book details dialog
const books = ref([]);
const watchlist = ref([]);
const dialogs = ref(null);

//@sree-sanjana06 > loading and error states
const loading = ref(false);
const loadError = ref('');
const watchlistError = ref(false);
const watchlistLoading = ref(true);
const saving = reactive(new Map());

//@sree-sanjana06 > search, genre and sorting filters for Browse Books
const route = useRoute();
const router = useRouter();
const querytext = value => typeof value === 'string' ? value : '';
const querypage = () => {
  const value = Number(querytext(route.query.page));
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
};
const filters = computed(() => ({ search: querytext(route.query.search), subject: querytext(route.query.subject), sort: ['title', 'author', 'newest'].includes(route.query.sort) ? route.query.sort : 'title' }));

//@sree-sanjana06 > pagination and saved-book lookup
const page = ref(querypage());
const pageSize = 15;
const total = ref(0);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
const savedIds = computed(() => {
  const ids = new Set(watchlist.value.map(entry => entry.bookid?.id).filter(Boolean));
  for (const [id, saved] of saving) {
    if (saved) ids.add(id);
    else ids.delete(id);
  }
  return ids;
});

let requestId = 0;
let controller;
let watchlistcontroller;

//@1ejun6 > filters own search URL updates > page changes preserve those filters
function setpage(value, replace = false) {
  const query = { ...route.query };
  if (value === 1) delete query.page;
  else query.page = String(value);
  return router[replace ? 'replace' : 'push']({ query });
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
        sort: filters.value.sort
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
    if (!books.value.length) toast.info('no books found > adjust search & filters', { id: 'browse-empty' });
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

//@sree-sanjana06 > fetch saved books to identify existing watchlist entries
async function loadWatchlist() {
  watchlistcontroller?.abort();
  const request = new AbortController();
  watchlistcontroller = request;
  watchlistLoading.value = true;
  watchlistError.value = false;
  try {
    const response = await api('/watchlist', { method: 'GET', signal: request.signal });
    watchlist.value = response.watchlist || [];
  } catch (error) {
    if (request.signal.aborted) return;
    watchlistError.value = true;
    toast.error(error.message, { duration: Infinity, closeButton: true, action: { label: 'retry', onClick: loadWatchlist } });
  } finally {
    if (watchlistcontroller === request) watchlistLoading.value = false;
  }
}

//@1ejun6 > change bookmark immediately > clearing pending state restores saved value if request fails
async function toggleSave(book) {
  if (watchlistLoading.value || watchlistError.value || saving.has(book.id)) return;
  const trigger = document.activeElement;
  const entry = watchlist.value.find(item => item.bookid?.id === book.id);
  saving.set(book.id, !entry);
  try {
    if (entry) {
      await api(`/watchlist/${entry.id}`, { method: 'DELETE' });
      watchlist.value = watchlist.value.filter(item => item.id !== entry.id);
      toast.dismiss(`watchlist-comment-${book.id}`);
      toast.success('removed from watchlist');
    } else {
      const response = await api('/watchlist', { method: 'POST', body: { bookid: book.id, comments: '' } });
      const savedEntry = { ...response.entry, bookid: book };
      watchlist.value.push(savedEntry);
      dialogs.value?.showSavedToast(savedEntry, trigger);
    }
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.delete(book.id);
  }
}

watch(page, value => {
  if (value !== querypage()) setpage(value);
});

//@1ejun6 > reload & browser navigation restore controls from URL before fetching
watch(() => [route.query.search, route.query.subject, route.query.sort, route.query.page], () => {
  if (route.name !== 'customerBooks') return;
  page.value = querypage();
  fetchBooks();
}, { immediate: true });

onMounted(loadWatchlist);
onBeforeUnmount(() => {
  cancelbooks();
  watchlistcontroller?.abort();
});
</script>

<template>
  <section class="mx-auto w-full max-w-7xl space-y-8">
    <header class="space-y-2 border-b pb-6">
      <h1 class="text-4xl">Find your next read</h1>
      <p class="text-muted-foreground">A shared collection. A new home for every book.</p>
    </header>

    <!--@sree-sanjana06 > reusable customer filters built with AppToolbar-->
    <BrowseBookFilters @pending="cancelbooks(); loading = true" @refresh="fetchBooks" />

    <p v-if="!loadError && !loading" class="text-sm text-muted-foreground" role="status">{{ total }} books found</p>

    <section v-if="!loadError" class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <template v-if="loading">
        <CustomerBookCard v-for="index in 6" :key="index" loading />
      </template>
      <template v-else>
        <CustomerBookCard v-for="book in books" :key="book.id" :book="book" :saved="savedIds.has(book.id)"
          :busy="watchlistLoading || watchlistError || saving.has(book.id)" @preview="dialogs?.openBookDetails($event)"
          @save="toggleSave" @unsave="toggleSave" />
      </template>
    </section>

    <!--@sree-sanjana06 > existing pagination component-->
    <AppPagination v-if="!loadError && total > 0" v-model:page="page" itemLabel="books" :total="total"
      :visibleCount="books.length" :pageSize="pageSize" :pageCount="pageCount" :loading="loading" :disabled="loading" />

    <!--@sree-sanjana06 > shared book details popup; request workflow handled separately-->
    <CustomerBookDialogs ref="dialogs" :savedIds="savedIds" :canSave="!watchlistLoading && !watchlistError" :busyIds="new Set(saving.keys())" @save="toggleSave" />

  </section>
</template>
