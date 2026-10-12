<script setup>
import { ref, computed } from 'vue';
import AdminToolbar from '@/components/AdminToolbar.vue';
import AdminRecordTable from '@/components/AdminRecordTable.vue';
import BookIdentity from '@/components/BookIdentity.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

//j > 1. reactive filter and selection state
const searchQuery = ref('');
const activeStatusTab = ref('all');
const selectedGenre = ref('all');
const selectedIds = ref([]);
const isLoading = ref(false);

//j > 2. table columns configuration
const columns = [
  { key: 'book', label: 'Book' },
  { key: 'isbn', label: 'ISBN' },
  { key: 'status', label: 'Status' },
];

//j > 3. sample book inventory records with genres and cover variants
const books = ref([
  {
    id: 'book-1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0-7432-7356-5',
    status: 'Available',
    genre: 'Classic',
    cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'book-2',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '978-0-06-112008-4',
    status: 'Reserved',
    genre: 'Classic',
    cover: '', //j > tests no-cover fallback placeholder
  },
  {
    id: 'book-3',
    title: '1984',
    author: 'George Orwell',
    isbn: '978-0-452-28423-4',
    status: 'Adopted',
    genre: 'Dystopian',
    cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'book-4',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    isbn: '978-0-14-143951-8',
    status: 'Available',
    genre: 'Classic',
    cover: '',
  },
  {
    id: 'book-5',
    title: 'Moby Dick',
    author: 'Herman Melville',
    isbn: '978-0-14-243724-7',
    status: 'Reserved',
    genre: 'Adventure',
    cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=120&q=80',
  },
  {
    id: 'book-6',
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    isbn: '978-0-316-76948-8',
    status: 'Available',
    genre: 'Fiction',
    cover: '',
  },
]);

//j > 4. counts for inventory status tabs
const counts = computed(() => ({
  all: books.value.length,
  available: books.value.filter((b) => b.status.toLowerCase() === 'available').length,
  reserved: books.value.filter((b) => b.status.toLowerCase() === 'reserved').length,
  adopted: books.value.filter((b) => b.status.toLowerCase() === 'adopted').length,
}));

//j > 5. filtered list combining status tab, genre select, and search query
const filteredBooks = computed(() => {
  return books.value.filter((book) => {
    // status tab filter
    if (activeStatusTab.value !== 'all' && book.status.toLowerCase() !== activeStatusTab.value.toLowerCase()) {
      return false;
    }
    // genre dropdown filter
    if (selectedGenre.value !== 'all' && book.genre !== selectedGenre.value) {
      return false;
    }
    // search filter across title, author, and isbn
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const matchTitle = book.title.toLowerCase().includes(q);
      const matchAuthor = book.author.toLowerCase().includes(q);
      const matchIsbn = book.isbn.toLowerCase().includes(q);
      return matchTitle || matchAuthor || matchIsbn;
    }
    return true;
  });
});

//j > reset all filters back to default
function resetFilters() {
  searchQuery.value = '';
  activeStatusTab.value = 'all';
  selectedGenre.value = 'all';
}

//j > event handlers
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

    <!-- Admin Record Toolbar (Search + Genre Filter + Batch Selection Banner) -->
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
          <option value="Classic">Classic</option>
          <option value="Dystopian">Dystopian</option>
          <option value="Adventure">Adventure</option>
          <option value="Fiction">Fiction</option>
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