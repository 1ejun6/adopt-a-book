<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/lib/api'
import AdminToolbar from '@/components/AdminToolbar.vue'
import AdminTable from '@/components/AdminTable.vue'
import BookIdentity from '@/components/BookIdentity.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import Message from '@/components/Message.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const books = ref([]);
const selectedIds = ref([]);
const filters = reactive({ search: '', status: 'all', genre: 'all' });
const loading = ref(false);
const deleting = ref(false);
const deleteError = ref('');
const successMessage = ref('');
const deletedTitles = ref([]);

const columns = [
    { key: 'book', label: 'Book' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'status', label: 'Status' }
];

const tabs = [
    { value: 'all', label: 'All books' },
    { value: 'available', label: 'Available' },
    { value: 'reserved', label: 'Reserved' },
    { value: 'adopted', label: 'Adopted' },
    { value: 'withdrawn', label: 'Withdrawn' }
];

const availableGenres = computed(() => {
    return [...new Set(books.value.flatMap(book => book.subjects).filter(Boolean))].sort();
});

const counts = computed(() => ({
    all: books.value.length,
    available: books.value.filter(book => book.status === 'available').length,
    reserved: books.value.filter(book => book.status === 'reserved').length,
    adopted: books.value.filter(book => book.status === 'adopted').length,
    withdrawn: books.value.filter(book => book.status === 'withdrawn').length
}));

const filteredBooks = computed(() => {
    const query = filters.search.trim().toLowerCase();
    return books.value.filter(book => {
        const matchesStatus = filters.status === 'all' || book.status === filters.status;
        const matchesGenre = filters.genre === 'all' || book.subjects.includes(filters.genre);
        const matchesSearch = [book.title, book.author, book.isbn].some(value => value.toLowerCase().includes(query));
        return matchesStatus && matchesGenre && matchesSearch;
    });
});

async function fetchBooks() {
    if (loading.value) {
        return;
    }
    loading.value = true;

    try {
        const response = await api('/admin/books');
        const records = Array.isArray(response.books) ? response.books : [];
        books.value = records.map(book => ({
            id: book.id,
            title: book.title || 'Untitled',
            author: Array.isArray(book.authors) && book.authors.length
                ? book.authors.join(', ') : (book.author || 'Unknown Author'),
            isbn: book.isbn || '—',
            status: (book.status || 'available').toLowerCase(),
            subjects: Array.isArray(book.subjects) ? book.subjects : [],
            cover: book.coverurl || '',
        }));
    } catch (error) {
        console.error(error.message);
    } finally {
        loading.value = false;
    }
}

function addBook() {
}

function editBook() {
}

async function deleteBooks() {
    if (deleting.value || !selectedIds.value.length) {
        return
    };
    const bookids = [...selectedIds.value];
    const titles = books.value.filter(book => bookids.includes(book.id)).map(book => book.title);
    deleting.value = true;
    deleteError.value = '';
    successMessage.value = '';
    deletedTitles.value = [];
    try {
        const result = await api(bookids.length === 1 ? `/admin/books/${bookids[0]}` : '/admin/books', {
            method: 'DELETE',
            body: bookids.length === 1 ? undefined : { ids: bookids },
        });
        const deleted = result.deletedids || [];
        const withdrawn = result.withdrawnids || [];
        books.value = books.value.filter(book => !deleted.includes(book.id)).map(book =>
            withdrawn.includes(book.id) ? { ...book, status: 'withdrawn' } : book);

        selectedIds.value = selectedIds.value.filter(id => !bookids.includes(id));
        successMessage.value = [deleted.length ? `${deleted.length} deleted` : '', withdrawn.length ? `${withdrawn.length} withdrawn; history kept` : ''].filter(Boolean).join(' · ');
        deletedTitles.value = titles;
    } catch (error) {
        deleteError.value = error.message;
    } finally {
        deleting.value = false;
    }
}

function openBook() {
}

onMounted(fetchBooks);
</script>
<template>
    <main class="mx-auto w-full max-w-7xl space-y-5 p-5">
        <header class="flex items-center justify-between gap-5">
            <div>
                <h1>Book Inventory</h1>
                <p class="text-muted-foreground">organisation copies and community listings from intake to handover</p>
            </div>
            <Button @click="addBook">
                <span>Import | Add Book</span>
            </Button>
        </header>

        <Tabs v-model="filters.status">
            <TabsList>
                <TabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value" class="gap-2.5">
                    {{ tab.label }}
                    <Badge v-if="tab.value === 'all'" class="bg-primary tabular-nums">
                        {{ counts[tab.value] }}
                    </Badge>
                    <StatusBadge v-else :status="tab.value" class="tabular-nums ">
                        {{ counts[tab.value] }}
                    </StatusBadge>
                </TabsTrigger>
            </TabsList>
        </Tabs>

        <AdminToolbar v-model:search="filters.search" searchPlaceHolder="Search by Titile, Author, ISBN..."
            :selectedRowCount="selectedIds.length">
            <template #filters>
                <div class="relative w-full sm:w-auto">
                    <select v-model="filters.genre" class="w-full appearance-none rounded-lg border bg-background py-2.5 pl-2.5 pr-10 text-sm">
                        <option value="all">All genres</option>
                        <option v-for="genre in availableGenres" :key="genre" :value="genre">{{ genre }}</option>
                    </select>
                    <svg class="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>
            </template>
            <template #selectionActions="{ onlyOne }">
                <Button size="sm" class="bg-card" :disabled="!onlyOne" @click="editBook">Edit</Button>
                <Button variant="destructive" size="sm" :disabled="deleting" @click="deleteBooks">{{ deleting ? 'Deleting…' : 'Delete' }}</Button>
            </template>
        </AdminToolbar>

        <Message v-if="deleteError || successMessage" :variant="deleteError ? 'error' : 'success'"
            :message="deleteError || successMessage" :items="deleteError ? [] : deletedTitles"
            @dismiss="deleteError = ''; successMessage = ''; deletedTitles = []" />

        <AdminTable :rows="filteredBooks" :columns="columns" :selectedIds="selectedIds" :isLoading="loading"
            emptyTitle="No books in this view" emptyDescription="Try another Status Tab, Genre, Search term"
            @selectedRows="selectedIds = $event" @openRow="openBook">
            <template #cell-book="{ row }">
                <BookIdentity :title="row.title" :author="row.author" :cover="row.cover" />
            </template>
            <template #cell-isbn="{ value }">
                <span class="text-xs text-muted-foreground">{{ value }}</span>
            </template>
            <template #cell-status="{ value }">
                <StatusBadge :status="value" />
            </template>
        </AdminTable>
    </main>
</template>
