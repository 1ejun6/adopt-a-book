<!-- lee-hlmilk > AI GENERATED TO TEST DATA SEEDING VIA SUPABASE, AND CHECKING ADMINBOOKS VIEW -->

<script setup>
import { ref, computed, onMounted } from 'vue';
import AdminToolbar from '@/components/AdminToolbar.vue';
import AdminRecordTable from '@/components/AdminRecordTable.vue';
import BookIdentity from '@/components/BookIdentity.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

//j > 1. api base endpoint configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

//j > 2. reactive filter, selection, and request state
const searchQuery = ref('');
const activeStatusTab = ref('all');
const selectedGenre = ref('all');
const selectedIds = ref([]);
const isLoading = ref(false);
const errorMessage = ref('');
const books = ref([]);

//j > 3. table columns configuration
const columns = [
  { key: 'book', label: 'Book' },
  { key: 'isbn', label: 'ISBN' },
  { key: 'status', label: 'Status' },
];

//j > 4. normalizes database records from supabase into ui-friendly props
function mapBookRecord(b) {
  return {
    id: b.id,
    title: b.title || 'Untitled',
    //j > convert authors array from postgres into a single comma-separated string for BookIdentity
    author: Array.isArray(b.authors) && b.authors.length > 0
      ? b.authors.join(', ')
      : (b.author || 'Unknown Author'),
    isbn: b.isbn || '—',
    status: b.status || 'available',
    //j > extract primary subject for single badge or genre dropdown matching
    genre: Array.isArray(b.subjects) && b.subjects.length > 0
      ? b.subjects[0]
      : 'Uncategorized',
    subjects: Array.isArray(b.subjects) ? b.subjects : [],
    //j > map coverurl database column to cover prop
    cover: b.coverurl || '',
    raw: b, //j > stores raw backend payload for future edit/view dialogs
  };
}

//j > 5. fetches books from the local express server
async function fetchBooks() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch(`${API_BASE_URL}/admin/books`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      //j > critical: sends http-only auth cookies across origins
      credentials: 'include',
    });

    if (response.status === 401) {
      throw new Error('Authentication required. Please log in as an admin to view inventory.');
    }

    if (response.status === 403) {
      throw new Error('Access denied. Administrator privileges are required.');
    }

    if (!response.ok) {
      throw new Error(`Failed to load books (HTTP ${response.status})`);
    }

    const data = await response.json();
    const rawBooks = Array.isArray(data.books) ? data.books : [];
    books.value = rawBooks.map(mapBookRecord);
  } catch (err) {
    console.error('Error loading inventory from server:', err);
    errorMessage.value = err.message || 'Unable to connect to the backend server.';
  } finally {
    isLoading.value = false;
  }
}

//j > 6. dynamically extracts unique genres/subjects from the loaded books
const availableGenres = computed(() => {
  const set = new Set();
  books.value.forEach((b) => {
    if (Array.isArray(b.subjects)) {
      b.subjects.forEach((s) => s && set.add(s));
    } else if (b.genre) {
      set.add(b.genre);
    }
  });
  return Array.from(set).sort();
});

//j > 7. status tab counter badges computed dynamically from loaded records
const counts = computed(() => ({
  all: books.value.length,
  available: books.value.filter((b) => b.status?.toLowerCase() === 'available').length,
  reserved: books.value.filter((b) => b.status?.toLowerCase() === 'reserved').length,
  adopted: books.value.filter((b) => b.status?.toLowerCase() === 'adopted').length,
}));

//j > 8. reactive filtering combining tab selection, genre dropdown, and search query
const filteredBooks = computed(() => {
  return books.value.filter((book) => {
    // status tab filter
    if (activeStatusTab.value !== 'all' && book.status?.toLowerCase() !== activeStatusTab.value.toLowerCase()) {
      return false;
    }

    // genre dropdown filter
    if (selectedGenre.value !== 'all') {
      const matchesGenre = book.subjects?.includes(selectedGenre.value) || book.genre === selectedGenre.value;
      if (!matchesGenre) return false;
    }

    // search query filter matching title, author, or isbn
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const matchTitle = book.title?.toLowerCase().includes(q);
      const matchAuthor = book.author?.toLowerCase().includes(q);
      const matchIsbn = book.isbn?.toLowerCase().includes(q);
      return matchTitle || matchAuthor || matchIsbn;
    }

    return true;
  });
});

//j > resets all active toolbar filters
function resetFilters() {
  searchQuery.value = '';
  activeStatusTab.value = 'all';
  selectedGenre.value = 'all';
}

//j > table action handlers
function handleAddBook() {
  alert('Open Import / Add Book dialog');
}

function handleEdit() {
  const selectedBook = books.value.find((b) => b.id === selectedIds.value[0]);
  alert(`Edit book: ${selectedBook?.title}`);
}

function handleDelete() {
  alert(`Delete ${selectedIds.value.length} selected book copy/copies`);
}

function handleOpenRecord(record) {
  alert(`Open details for: ${record.title}`);
}

//j > fetch real supabase data on component mount
onMounted(() => {
  fetchBooks();
});
</script>

<template>
  <main class="min-h-screen bg-background p-6 md:p-8 max-w-5xl mx-auto space-y-6">
    <!-- Page Header with Primary Action -->
    <header class="flex items-start justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-3xl font-heading text-foreground">Book Collection</h1>
        <p class="text-sm text-muted-foreground">
          Dates, physical copies, and community availability.
        </p>
      </div>

      <!-- Top Primary Create Button -->
      <Button variant="outline" size="sm" @click="handleAddBook">
        Import / add book
      </Button>
    </header>

    <!-- Error / Auth Banner if fetch failed -->
    <div
      v-if="errorMessage"
      class="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between gap-4"
    >
      <div class="space-y-0.5">
        <p class="font-medium">Connection Notice</p>
        <p class="text-xs opacity-90">{{ errorMessage }}</p>
      </div>
      <Button variant="outline" size="sm" @click="fetchBooks">
        Retry
      </Button>
    </div>

    <!-- Status Tabs (InventoryTabs from blueprint) -->
    <Tabs v-model="activeStatusTab" class="w-full">
      <TabsList class="h-10 p-1">
        <TabsTrigger value="all" class="gap-2">
          All books
          <span class="text-xs px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground font-semibold">
            {{ counts.all }}
          </span>
        </TabsTrigger>
        <TabsTrigger value="available" class="gap-2">
          Available
          <span class="text-xs px-1.5 py-0.5 rounded-full bg-badge-green text-badge-green-foreground font-semibold">
            {{ counts.available }}
          </span>
        </TabsTrigger>
        <TabsTrigger value="reserved" class="gap-2">
          Reserved
          <span class="text-xs px-1.5 py-0.5 rounded-full bg-badge-amber text-badge-amber-foreground font-semibold">
            {{ counts.reserved }}
          </span>
        </TabsTrigger>
        <TabsTrigger value="adopted" class="gap-2">
          Adopted
          <span class="text-xs px-1.5 py-0.5 rounded-full bg-badge-neutral text-badge-neutral-foreground font-semibold">
            {{ counts.adopted }}
          </span>
        </TabsTrigger>
      </TabsList>
    </Tabs>

    <!-- Admin Record Toolbar (Search + Dynamic Genre Filter + Selection Banner) -->
    <AdminToolbar
      v-model:search="searchQuery"
      search-placeholder="Search by title, author or ISBN..."
      :selected-count="selectedIds.length"
      :hint="selectedIds.length > 1 ? 'Select one record to edit.' : ''"
    >
      <!-- Genre Dropdown slotted into #filters -->
      <template #filters>
        <select
          v-model="selectedGenre"
          class="h-10 px-3 rounded-md border border-input bg-card text-sm text-foreground shadow-xs outline-none focus-visible:border-ring cursor-pointer"
          aria-label="Filter by genre"
        >
          <option value="all">All genres</option>
          <option v-for="genre in availableGenres" :key="genre" :value="genre">
            {{ genre }}
          </option>
        </select>
      </template>

      <!-- Page-specific selection actions: Edit & Delete -->
      <template #selection-actions="{ isSingle }">
        <Button
          variant="outline"
          size="sm"
          :disabled="!isSingle"
          @click="handleEdit"
        >
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="text-destructive hover:bg-destructive/10"
          @click="handleDelete"
        >
          Delete
        </Button>
      </template>
    </AdminToolbar>

    <!-- Admin Record Table with Custom Cell Slots -->
    <AdminRecordTable
      :records="filteredBooks"
      :columns="columns"
      v-model="selectedIds"
      :loading="isLoading"
      empty-title="No books in this view"
      empty-description="Try selecting another tab or clearing your filters."
      :show-clear-filters="searchQuery.length > 0 || activeStatusTab !== 'all' || selectedGenre !== 'all'"
      @clear-filters="resetFilters"
      @open-record="handleOpenRecord"
    >
      <!-- Book Identity in book column -->
      <template #cell-book="{ record }">
        <BookIdentity
          :title="record.title"
          :author="record.author"
          :cover="record.cover"
          compact
        />
      </template>

      <!-- ISBN Column -->
      <template #cell-isbn="{ value }">
        <span class="text-xs font-mono text-muted-foreground">{{ value }}</span>
      </template>

      <!-- Color-coded Status Badge Column -->
      <template #cell-status="{ value }">
        <StatusBadge :status="value" />
      </template>
    </AdminRecordTable>
  </main>
</template>