<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
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
const filters = reactive({ search: '', subject: '', sort: 'title' });

//@sree-sanjana06 > pagination and saved-book lookup
const page = ref(1);
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

//@sree-sanjana06 > fetch matching books using existing catalogue API
async function fetchBooks() {
  const id = ++requestId;
  loading.value = true;
  loadError.value = '';

  try {
    const response = await api('/books', {
      method: 'GET',
      query: {
        page: page.value,
        limit: pageSize,
        search: filters.search.trim(),
        status: 'available',
        subject: filters.subject.trim() || undefined,
        sort: filters.sort
      }
    });

    //@sree-sanjana06 > ignore outdated requests when filters change quickly
    if (id !== requestId) return;

    total.value = Number(response.total ?? 0);

    //@sree-sanjana06 > correct page if results now have fewer pages
    if (page.value > pageCount.value) {
      page.value = pageCount.value;
      return;
    }

    books.value = Array.isArray(response.books) ? response.books : [];
    if (!books.value.length) toast.info('no books found > adjust search & filters', { id: 'browse-empty' });
  } catch (error) {
    if (id !== requestId) return;
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
  watchlistLoading.value = true;
  watchlistError.value = false;
  try {
    const response = await api('/watchlist', { method: 'GET' });
    watchlist.value = response.watchlist || [];
  } catch (error) {
    watchlistError.value = true;
    toast.error(error.message, { duration: Infinity, closeButton: true, action: { label: 'retry', onClick: loadWatchlist } });
  } finally {
    watchlistLoading.value = false;
  }
}

//@1ejun6 > change bookmark immediately > clearing pending state restores saved value if request fails
async function toggleSave(book) {
  if (watchlistLoading.value || watchlistError.value || saving.has(book.id)) return;
  const entry = watchlist.value.find(item => item.bookid?.id === book.id);
  saving.set(book.id, !entry);
  try {
    if (entry) {
      await api(`/watchlist/${entry.id}`, { method: 'DELETE' });
      watchlist.value = watchlist.value.filter(item => item.id !== entry.id);
      toast.success('removed from watchlist');
    } else {
      const response = await api('/watchlist', { method: 'POST', body: { bookid: book.id, comments: '' } });
      watchlist.value.push({ ...response.entry, bookid: book });
      toast.success('saved to watchlist');
    }
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.delete(book.id);
  }
}

//@sree-sanjana06 > reset to page 1 when filters change, then fetch results
watch(filters, () => {
  if (page.value === 1) fetchBooks();
  else page.value = 1;
});

watch(page, fetchBooks, { immediate: true });
onMounted(loadWatchlist);
</script>

<template>
  <section class="mx-auto w-full max-w-7xl space-y-8">
    <header class="space-y-2 border-b pb-6">
      <p class="text-xs uppercase tracking-widest text-muted-foreground">Discover your next chapter</p>
      <h1 class="text-4xl">Find your next read</h1>
      <p class="text-muted-foreground">A shared collection. A new home for every book.</p>
    </header>

    <!--@sree-sanjana06 > reusable customer filters built with AppToolbar-->
    <BrowseBookFilters v-model:search="filters.search" v-model:subject="filters.subject" v-model:sort="filters.sort" />

    <p v-if="!loadError && !loading" class="text-sm text-muted-foreground" role="status">{{ total }} books found</p>

    <section v-if="!loadError" class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <template v-if="loading">
        <CustomerBookCard v-for="index in 6" :key="index" loading />
      </template>
      <template v-else>
        <CustomerBookCard v-for="book in books" :key="book.id" :book="book" :saved="savedIds.has(book.id)" :busy="watchlistLoading || watchlistError || saving.has(book.id)" @preview="dialogs?.openBookDetails($event)" @save="toggleSave" @unsave="toggleSave" />
      </template>
    </section>

    <!--@sree-sanjana06 > existing pagination component-->
    <AppPagination v-if="!loadError && total > 0" v-model:page="page" itemLabel="books" :total="total" :visibleCount="books.length" :pageSize="pageSize" :pageCount="pageCount" :loading="loading" :disabled="loading" />

    <!--@sree-sanjana06 > shared book details popup; request workflow handled separately-->
    <CustomerBookDialogs ref="dialogs" :savedIds="savedIds" />

  </section>
</template>
