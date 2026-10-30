<script setup>
//!@1ejun6 > why are you loading watchlist? should it not be a post for watchlist?
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
const watchlistError = ref('');

//@sree-sanjana06 > search, genre and sorting filters for Browse Books
const filters = reactive({ search: '', subject: '', sort: 'title'});

//@sree-sanjana06 > pagination and saved-book lookup
const page = ref(1);
const pageSize = 15;
const total = ref(0);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
const savedIds = computed(() => new Set(
  watchlist.value.map(entry => entry.bookid?.id).filter(Boolean)
));

let requestId = 0;

//@sree-sanjana06 > fetch matching books using existing catalogue API
async function fetchBooks() {
  const id = ++requestId;
  loading.value = true;
  loadError.value = '';

  try {
    const response = await api('/books', { 
      query: {
        method: 'GET',
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
  } catch (error) {
    if (id !== requestId) return;
    loadError.value = error.message;
    books.value = [];
    total.value = 0;
  } finally {
    if (id === requestId) loading.value = false;
  }
}

//@sree-sanjana06 > fetch saved books to identify existing watchlist entries
async function loadWatchlist() {
  watchlistError.value = '';
  try {
    const response = await api('/watchlist', { method: 'GET' }); //!@1ejun6 > where is method?
    watchlist.value = response.watchlist || [];
  } catch (error) {
    watchlistError.value = error.message;
  }
}

 //@sree-sanjana06 > save book directly to watchlist without opening a popup
async function saveBook(book) {
  try {
    await api('/watchlist', {
      method: 'POST',
      body: {
        bookid: book.id,
        comments: ''
      }
    });

    await loadWatchlist();
  } catch (error) {
    watchlistError.value = error.message;
  }
}

//@sree-sanjana06 > remove saved book directly from watchlist
async function unsaveBook(book) {
  const entry = watchlist.value.find(
    item => item.bookid?.id === book.id
  );

  if (!entry) return;

  try {
    await api(`/watchlist/${entry.id}`, {
      method: 'DELETE'
    });

    await loadWatchlist();
  } catch (error) {
    watchlistError.value = error.message;
  }
}

//@sree-sanjana06 > reset all filters using the same reactive object
function clearFilters() {
  Object.assign(filters, { search: '', subject: '', sort: 'title' });
}

//@sree-sanjana06 > reset to page 1 when filters change, then fetch results
watch(filters, () => {
  if (page.value === 1) fetchBooks();
  else page.value = 1;
});

//@sree-sanjana06 > fetch on first load and whenever page changes
watch(page, fetchBooks, { immediate: true });
onMounted(loadWatchlist);
</script>

<template>
  <main class="mx-auto w-full max-w-7xl space-y-8">
    <header class="space-y-2 border-b pb-6">
      <p class="text-xs uppercase tracking-widest text-muted-foreground">
        Discover your next chapter
      </p>
      <h1 class="font-heading text-4xl">Find your next read</h1>
      <p class="text-muted-foreground">
        A shared collection. A new home for every book.
      </p>
    </header>

    <!--@sree-sanjana06 > reusable customer filters built with AppToolbar-->
    <BrowseBookFilters
      v-model:search="filters.search"
      v-model:subject="filters.subject"
      v-model:sort="filters.sort"
      @clear="clearFilters"/>

    <!--@sree-sanjana06 > show result count and watchlist errors-->
    <p class="text-sm text-muted-foreground" role="status">
      {{ loading ? 'Loading books...' : `${total} books found` }}
    </p>
    <p v-if="watchlistError" class="text-sm text-destructive">
      Could not check your saved books. {{ watchlistError }}
    </p>

    <!--@sree-sanjana06 > loading, error and empty result states-->
    <div v-if="loadError" class="space-y-3 rounded-xl border p-5">
      <p class="text-destructive">{{ loadError }}</p>
      <Button variant="outline" @click="fetchBooks">Try Again</Button>
    </div>

    <p v-else-if="loading" class="text-muted-foreground">
      Finding books for you...
    </p>

    <div v-else-if="!books.length"
      class="space-y-3 rounded-xl border bg-card p-8 text-center">
      <h2 class="font-heading text-2xl">No books found</h2>
      <p class="text-sm text-muted-foreground">
        Try another search or change your filters.
      </p>
    </div>

<!--@sree-sanjana06 > display available books using shared customer card-->
      <section v-else class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <CustomerBookCard v-for="book in books" :key="book.id" :book="book" variant="browse"
          :saved="savedIds.has(book.id)"
          @preview="dialogs?.openBookDetails($event)"
          @save="saveBook" @unsave="unsaveBook"
        />
      </section>

    <!--@sree-sanjana06 > existing pagination component-->
    <AppPagination v-if="!loadError && total > 0"
      v-model:page="page"
      itemLabel="books"
      :total="total"
      :visibleCount="books.length"
      :pageSize="pageSize"
      :pageCount="pageCount"
      :loading="loading"
      :disabled="loading"
    />

    <!--@sree-sanjana06 > shared book details popup; request workflow handled separately-->
    <CustomerBookDialogs ref="dialogs" />

  </main>
</template>
