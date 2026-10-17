<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import AppFilters from '@/components/shared/AppFilters.vue'
import AppPagination from '@/components/shared/AppPagination.vue'
import AdminTable from '@/components/admin/AdminTable.vue'
import BookDetailsDialog from '@/components/admin/BookDetailsDialog.vue'
import BookIdentity from '@/components/shared/AppBookIdentity.vue'
import StatusBadge from '@/components/shared/AppStatusBadge.vue'
import { Button } from '@/components/ui/button'

const books = ref([]);
const selectedBook = ref(null);
const dialogOpen = ref(false);
const selectedIds = ref([]);
const filters = reactive({ search: '', status: 'all', genre: 'all' });
const loading = ref(false);
const deleting = ref(false);
const availableGenres = ref([]);
const counts = ref({ all: 0, available: 0, reserved: 0, adopted: 0, withdrawn: 0 });
const page = ref(1);
const pageSize = 15;
const total = ref(0);
const loadError = ref('');
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
let requestId = 0;

const bookDetails = new Map();
let bookRequestId = 0;
//@1ejun6 > fetch full details on click > cache request for repeat opens &&& ignore older clicks
async function openBook(book) {
    if (loading.value || deleting.value) { return; }
    const id = ++bookRequestId;
    let request = bookDetails.get(book.id);
    try {
        if (!request) {
            request = api(`/admin/books/${book.id}`).then(response => response.currentbook);
            bookDetails.set(book.id, request);
        }
        const details = await request;
        if (id !== bookRequestId) { return; }
        selectedBook.value = { ...book, ...details };
        dialogOpen.value = true;
    } catch (error) {
        if (bookDetails.get(book.id) === request) { bookDetails.delete(book.id); }
        if (id === bookRequestId) { toast.error(error.message); }
    }
}

async function fetchBooks() {
    const id = ++requestId;
    //@1ejun6 > refresh details cache when inventory page ||| filters change
    bookDetails.clear();
    bookRequestId++;
    loading.value = true;
    loadError.value = '';
    selectedIds.value = [];

    try {
        const response = await api('/admin/books', {
            query: {
                page: page.value,
                limit: pageSize,
                search: filters.search.trim(),
                status: filters.status === 'all' ? undefined : filters.status,
                subject: filters.genre === 'all' ? undefined : filters.genre
            },
        });

        if (id !== requestId) { return; }
        total.value = response.total;
        counts.value = response.counts;
        availableGenres.value = response.genres;

        //@1ejun6 > a deletion may remove last row on current page
        if (page.value > pageCount.value) { page.value = pageCount.value; return; }
        books.value = (Array.isArray(response.books) ? response.books : []).map(book => ({
            ...book,
            id: book.id,
            title: book.title || 'Untitled',
            author: (Array.isArray(book.authors) ? book.authors.join(', ') : '') || book.author || 'Unknown Author',
            isbn: book.isbn || '—',
            status: (book.status || 'available').toLowerCase(),
            cover: book.thumbnailurl || book.coverurl || ''
        }));
    } catch (error) {
        if (id !== requestId) { return; }
        loadError.value = error.message;
        toast.error(error.message, { action: { label: 'retry', onClick: fetchBooks } });
        books.value = [];
    } finally {
        if (id === requestId) { loading.value = false; }
    }
}

async function deleteBooks() {
    if (loading.value || deleting.value || !selectedIds.value.length) { return; }
    const version = requestId;
    const bookids = [...selectedIds.value];
    const titles = books.value.filter(book => bookids.includes(book.id)).map(book => book.title);
    deleting.value = true;
    try {
        const { deletedids = [], withdrawnids = [] } = await api('/admin/books', { method: 'DELETE', body: { ids: bookids } });
        for (const id of [...deletedids, ...withdrawnids]) { bookDetails.delete(id); }
        //@1ejun6 > update current refs after server confirms > only reload if view changed ||| page becomes empty
        if (version !== requestId) { await fetchBooks(); }
        else {
            const deleted = new Set(deletedids);
            const withdrawn = new Set(withdrawnids);
            const previousCount = books.value.length;
            for (const book of books.value) {
                if (deleted.has(book.id)) {
                    counts.value.all--;
                    counts.value[book.status]--;
                } else if (withdrawn.has(book.id) && book.status !== 'withdrawn') {
                    counts.value[book.status]--;
                    counts.value.withdrawn++;
                    book.status = 'withdrawn';
                }
            }
            books.value = books.value.filter(book => !deleted.has(book.id) && (filters.status === 'all' || book.status === filters.status));
            total.value -= previousCount - books.value.length;
            selectedIds.value = [];
            if (page.value > pageCount.value) { page.value = pageCount.value; }
            else if (!books.value.length && total.value > 0) { await fetchBooks(); }
        }
        const message = [deletedids.length ? `${deletedids.length} deleted` : '', withdrawnids.length ? `${withdrawnids.length} withdrawn; history kept` : ''].filter(Boolean).join(' · ');
        toast.info(message, {
            description: titles.map((title, index) => `${index + 1}. ${title}`).join('\n'),
            style: { whiteSpace: 'pre-line' }
        });
    } catch (error) { toast.error(error.message); }
    finally { deleting.value = false; }
}

watch(filters, () => {
    if (page.value === 1) { fetchBooks(); }
    else { page.value = 1; }
});

watch(page, fetchBooks, { immediate: true });

const statusTabs = [
    { value: 'all', label: 'All books' },
    { value: 'available', label: 'Available', status: 'available' },
    { value: 'reserved', label: 'Reserved', status: 'reserved' },
    { value: 'adopted', label: 'Adopted', status: 'adopted' }
];

const columns = [
    { key: 'book', label: 'Book' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'status', label: 'Status' }
];
</script>
<template>
    <main class="mx-auto w-full max-w-7xl space-y-5 p-5">
        <header class="flex items-center justify-between gap-5">
            <div>
                <h1>Book Inventory</h1>
                <p class="text-muted-foreground">organisation copies and community listings from intake to handover</p>
            </div>
            <Button>Add Book</Button>
        </header>

        <AppFilters v-model:search="filters.search" v-model:status="filters.status" v-model:genre="filters.genre"
            :tabs="statusTabs" searchPlaceholder="Search by Title, Author, ISBN..." :counts="counts"
            :genres="availableGenres" :selectedRowCount="selectedIds.length">
            <template #selectionActions="{ onlyOne }">
                <Button size="sm" class="bg-card" :disabled="!onlyOne">Edit</Button>
                <Button variant="destructive" size="sm" :disabled="deleting" @click="deleteBooks">{{ deleting ?
                    'Deleting…' : 'Delete' }}</Button>
            </template>
        </AppFilters>

        <AdminTable v-if="!loadError" :rows="books" :columns="columns" :selectedIds="selectedIds" :isLoading="loading"
            emptyTitle="No books in this view" emptyDescription="Try another Status Tab, Genre, Search term"
            @selectedRows="selectedIds = $event" @openRow="openBook">
            <template #cellBook="{ row }">
                <BookIdentity :title="row.title" :author="row.author" :cover="row.cover" />
            </template>
            <template #cellIsbn="{ value }">
                <span class="text-xs text-muted-foreground">{{ value }}</span>
            </template>
            <template #cellStatus="{ value }">
                <StatusBadge :status="value" />
            </template>
        </AdminTable>
        <BookDetailsDialog v-model:open="dialogOpen" :book="selectedBook" />
        <AppPagination itemLabel="books" v-if="!loadError && total > 0" v-model:page="page" :total="total"
            :visibleCount="books.length" :pageSize="pageSize" :pageCount="pageCount" :loading="loading" :disabled="loading || deleting" />
    </main>
</template>
