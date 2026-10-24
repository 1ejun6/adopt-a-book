<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppToolbar from '@/components/shared/AppToolbar.vue';
import AppPagination from '@/components/shared/AppPagination.vue';
import BrowseBookCard from '@/components/customer/BrowseBookCard.vue';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';

//@sree-sanjana06 > store catalogue results and customer watchlist
const books = ref([]);
const watchlist = ref([]);
const dialogs = ref(null);

//@sree-sanjana06 > store API loading and error states
const loading = ref(false);
const loadError = ref('');
const watchlistError = ref('');

//@sree-sanjana06 > filters match the existing GET /books query parameters
const filters = reactive({
  search: '',
  status: 'all',
  subject: '',
  sort: 'title'
});

//@sree-sanjana06 > server-side pagination using existing AppPagination
const page = ref(1);
const pageSize = 12;
const total = ref(0);
const pageCount = computed(() =>
  Math.max(1, Math.ceil(total.value / pageSize))
);

//@sree-sanjana06 > identify books already saved by the customer
const savedIds = computed(() => new Set(
  watchlist.value.map(entry => entry.bookid?.id).filter(Boolean)
));

let requestId = 0;

//@sree-sanjana06 > fetch books from backend with current search, filters and page
async function fetchBooks() {
  const id = ++requestId;
  loading.value = true;
  loadError.value = '';

  try {
    const response = await api('/books', {
      query: {
        page: page.value,
        limit: pageSize,
        search: filters.search.trim(),
        status: filters.status === 'all' ? undefined : filters.status,
        subject: filters.subject.trim() || undefined,
        sort: filters.sort
      }
    });

    //@sree-sanjana06 > ignore outdated responses when filters change quickly
    if (id !== requestId) return;

    total.value = Number(response.total ?? 0);

    //@sree-sanjana06 > move to last valid page if current page is out of range
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

//@sree-sanjana06 > load saved books for already-saved detection
async function loadWatchlist() {
  watchlistError.value = '';

  try {
    const response = await api('/watchlist');
    watchlist.value = response.watchlist || [];
  } catch (error) {
    watchlistError.value = error.message;
  }
}

//@sree-sanjana06 > open the existing book details, save and request popups
function openPreview(book) {
  dialogs.value?.openBookDetails(book);
}

//@sree-sanjana06 > update saved-book indicators after saving from Book Details
function updateWatchlist(entries) {
  watchlist.value = entries;
  watchlistError.value = '';
}

//@sree-sanjana06 > clear filters and return to the first page
function clearFilters() {
  filters.search = '';
  filters.status = 'all';
  filters.subject = '';
  filters.sort = 'title';
}

//@sree-sanjana06 > refetch when filters change; reset pagination first
watch(filters, () => {
  if (page.value === 1) fetchBooks();
  else page.value = 1;
});

//@sree-sanjana06 > fetch initial catalogue and whenever page changes
watch(page, fetchBooks, { immediate: true });

onMounted(loadWatchlist);
</script>

<template>
  <main class="mx-auto w-full max-w-7xl space-y-8">
    <!--@sree-sanjana06 > browse page heading-->
    <header class="space-y-2 border-b pb-6">
      <p class="text-xs uppercase tracking-widest text-muted-foreground">
        Discover your next chapter
      </p>
      <h1 class="font-heading text-4xl">Find your next read</h1>
      <p class="text-muted-foreground">
        A shared collection. A new home for every book.
      </p>
    </header>

    <!--@sree-sanjana06 > short explanation of the adoption journey-->
    <section class="flex flex-wrap gap-3 text-sm text-muted-foreground">
      <span class="rounded-lg border p-3">1. Find a book</span>
      <span class="rounded-lg border p-3">2. Request a copy</span>
      <span class="rounded-lg border p-3">3. Arrange pickup after approval</span>
    </section>

    <!--@sree-sanjana06 > reuse shared toolbar for searching and filters-->
    <AppToolbar v-model:search="filters.search"
      searchPlaceholder="Search by title, author or ISBN...">

      <template #filters>
        <!--@sree-sanjana06 > availability filter-->
        <select v-model="filters.status"
          aria-label="Availability"
          class="rounded-lg border bg-background p-2.5 text-sm">
          <option value="all">All availability</option>
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="adopted">Adopted</option>
        </select>

        <!--@sree-sanjana06 > subject filter uses existing backend subject parameter-->
        <Input v-model="filters.subject"
          placeholder="Subject, e.g. Fiction"
          aria-label="Subject"
          class="w-44" />

        <!--@sree-sanjana06 > sorting options supported by backend-->
        <select v-model="filters.sort"
          aria-label="Sort books"
          class="rounded-lg border bg-background p-2.5 text-sm">
          <option value="title">Title A–Z</option>
          <option value="author">Author A–Z</option>
          <option value="newest">Newest</option>
        </select>
      </template>

      <template #actions>
        <Button variant="outline" @click="clearFilters">
          Clear filters
        </Button>
      </template>
    </AppToolbar>

    <!--@sree-sanjana06 > display total matching books and loading feedback-->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted-foreground" role="status">
        {{ loading ? 'Loading books...' : `${total} books found` }}
      </p>
      <p class="text-sm text-muted-foreground">
        Open a book to read more, save it or request a copy.
      </p>
    </div>

    <p v-if="watchlistError" class="text-sm text-destructive">
      Could not check your saved books. {{ watchlistError }}
    </p>

    <!--@sree-sanjana06 > error state and retry button-->
    <div v-if="loadError" class="space-y-3 rounded-xl border p-5">
      <p class="text-destructive">{{ loadError }}</p>
      <Button variant="outline" @click="fetchBooks">Try Again</Button>
    </div>

    <!--@sree-sanjana06 > loading state-->
    <p v-else-if="loading" class="text-muted-foreground">
      Finding books for you...
    </p>

    <!--@sree-sanjana06 > empty state when no books match the filters-->
    <div v-else-if="books.length === 0"
      class="space-y-3 rounded-xl border bg-card p-8 text-center">
      <h2 class="font-heading text-2xl">No books found</h2>
      <p class="text-sm text-muted-foreground">
        Try another title, author, subject or availability filter.
      </p>
      <Button variant="outline" @click="clearFilters">
        Clear filters
      </Button>
    </div>

    <!--@sree-sanjana06 > display catalogue using reusable book cards-->
    <section v-else class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <BrowseBookCard
        v-for="book in books"
        :key="book.id"
        :book="book"
        :saved="savedIds.has(book.id)"
        @preview="openPreview"
      />
    </section>

    <!--@sree-sanjana06 > reuse existing pagination component-->
    <AppPagination
      v-if="!loadError && total > 0"
      v-model:page="page"
      itemLabel="books"
      :total="total"
      :visibleCount="books.length"
      :pageSize="pageSize"
      :pageCount="pageCount"
      :loading="loading"
      :disabled="loading"
    />

    <!--@sree-sanjana06 > reuse existing book details and adoption dialogs-->
    <CustomerBookDialogs
      ref="dialogs"
      :watchlist="watchlist"
      @saved="updateWatchlist"
    />
  </main>
</template>
