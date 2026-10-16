<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { api } from '@/lib/api'
import AdminToolbar from '@/components/AdminToolbar.vue'
import AdminTable from '@/components/AdminTable.vue'
import BookIdentity from '@/components/BookIdentity.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import SuccessMessage from '@/components/SuccessMessage.vue'
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

const columns = [
    { key: 'book', label: 'Book' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'status', label: 'Status' }
];

const tabs = [
    { value: 'all', label: 'All books' },
    { value: 'available', label: 'Available' },
    { value: 'reserved', label: 'Reserved' },
    { value: 'adopted', label: 'Adopted' }
];

const availableGenres = computed(() => {
    return [...new Set(books.value.flatMap(book => book.subjects).filter(Boolean))].sort();
});

const counts = computed(() => ({
    all: books.value.length,
    available: books.value.filter(book => book.status === 'available').length,
    reserved: books.value.filter(book => book.status === 'reserved').length,
    adopted: books.value.filter(book => book.status === 'adopted').length
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
    deleting.value = true;
    deleteError.value = '';
    successMessage.value = '';
    try {
        const response = await api(bookids.length === 1 ? `/admin/books/${bookids[0]}` : '/admin/books', {
            method: 'DELETE',
            body: bookids.length === 1 ? undefined : { bookids },
        });
        books.value = books.value.filter(book => !bookids.includes(book.id));
        selectedIds.value = selectedIds.value.filter(id => !bookids.includes(id));
        successMessage.value = response.message;
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
                <select v-model="filters.genre" class="w-full rounded-lg border bg-background px-3 py-2 text-sm sm:w-auto">
                    <option value="all">All genres</option>
                    <option v-for="genre in availableGenres" :key="genre" :value="genre">{{ genre }}</option>
                </select>
            </template>
            <template #selectionActions="{ onlyOne }">
                <Button size="sm" class="bg-card" :disabled="!onlyOne" @click="editBook">Edit</Button>
                <Button variant="destructive" size="sm" :disabled="deleting" @click="deleteBooks">{{ deleting ? 'Deleting…' : 'Delete' }}</Button>
            </template>
        </AdminToolbar>

        <SuccessMessage v-if="deleteError" variant="error" :message="deleteError" @dismiss="deleteError = ''" />
        <SuccessMessage v-if="successMessage" :message="successMessage" @dismiss="successMessage = ''" />

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
