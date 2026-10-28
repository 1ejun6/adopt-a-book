<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { useConfirmation } from '@/lib/confirmation';
import AdminList from '@/components/admin/AdminList.vue'
import BookFormDialog from '@/components/admin/BookFormDialog.vue'
import BookDetailsDialog from '@/components/admin/BookDetailsDialog.vue'
import BookIdentity from '@/components/shared/AppBookIdentity.vue'
import StatusBadge from '@/components/shared/AppStatusBadge.vue'
import { Button } from '@/components/ui/button'

const books = ref([]);
const selectedBook = ref(null);
const dialogOpen = ref(false);
const formOpen = ref(false);
const editingBook = ref(null);
const saving = ref(false);
const stations = ref([]);
//@lee-hlmilk > template ref gives access to form reset > draft fields stay inside BookFormDialog
const bookFormDialog = ref(null);
const importedIds = ref([]);
const lookup = reactive({ query: '', books: [], loading: false, searched: false, error: '' });
let lookupRequestId = 0;
const selectedIds = ref([]);
const selectedRow = computed(() => books.value.find(book => book.id === selectedIds.value[0]));
const selectedBooks = computed(() => books.value.filter(book => selectedIds.value.includes(book.id)));
const canSelect = computed(() => ['all', 'available'].includes(filters.status));
const deleteBlocked = computed(() => selectedBooks.value.some(book => book.status !== 'available'));
const { confirm } = useConfirmation();
const loading = ref(false);
const deleting = ref(false);
let requestId = 0;
const loadError = ref('');
let bookRequestId = 0;

const filters = reactive({ search: '', status: 'all', genre: 'all' });
const availableGenres = ref([]);
const counts = ref({ all: 0, available: 0, reserved: 0, adopted: 0 });
const bookDetails = new Map(); //@1ejun6 > hashmap

const page = ref(1);
const pageSize = 15;
const total = ref(0);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));

//@lee-hlmilk > share cached promise between details &&& edit > repeated opens reuse the same request
function getBookDetails(bookid) {
    let request = bookDetails.get(bookid);
    if (!request) {
        //@1ejun6 > currentbook is from backend
        request = api(`/admin/books/${bookid}`).then(response => response.currentbook); //@1ejun6 > extract
        bookDetails.set(bookid, request); //@1ejun6 > response
    }
    return request;
}

//@1ejun6 > fetch full details on click > cache request for repeat opens & ignore older clicks
async function openBook(book) {
    //@1ejun6 > id > a number assigned to this click \ request
    //@1ejun6 > ~book.id~ > book id in database
    //@1ejun6 > ~bookrequestid~ > holds latest request number & increases whenever you click a book
    if (loading.value || deleting.value) { return; }
    const id = ++bookRequestId;
    const request = getBookDetails(book.id);
    try {
        const details = await request;
        if (id !== bookRequestId) { return; }
        selectedBook.value = { ...book, ...details };
        dialogOpen.value = true;
    } catch (error) {
        if (bookDetails.get(book.id) === request) { bookDetails.delete(book.id); } //@1ejun6 > clear cache
        if (id === bookRequestId) { toast.error(error.message); }
    }
}

//@lee-hlmilk > reuse station catalogue across add &&& edit > form keeps inactive current station separately
function loadStations() {
    if (stations.value.length) { return Promise.resolve(); }
    return api('/locations/stations').then(response => { stations.value = response.stations; });
}

//@lee-hlmilk > load station choices before opening > null editingBook selects creation instead of editing
async function openAddBook() {
    if (loading.value || deleting.value || saving.value) { return; }
    const id = ++bookRequestId;
    try {
        await loadStations();
        if (id !== bookRequestId) { return; }
        editingBook.value = null;
        importedIds.value = [];
        resetLookup();
        dialogOpen.value = false;
        formOpen.value = true;
    } catch (error) {
        if (id === bookRequestId) { toast.error(error.message); }
    }
}

//@lee-hlmilk > lookup counter ignores responses after dialog closes ||| user selects a result
async function searchBooks() {
    const query = lookup.query.trim();
    if (!query || lookup.loading || saving.value) { return; }
    const id = ++lookupRequestId;
    Object.assign(lookup, { loading: true, error: '', searched: false, books: [] });
    try {
        const response = await api('/admin/open-library', { query: { q: query } });
        if (id !== lookupRequestId) { return; }
        lookup.books = response.books;
        lookup.searched = true;
    } catch (error) {
        if (id === lookupRequestId) { lookup.error = error.message; }
    } finally {
        if (id === lookupRequestId) { lookup.loading = false; }
    }
}

//@lee-hlmilk > invalidate response without clearing search results > Add and continue can reuse them
function cancelLookup() { lookupRequestId++; lookup.loading = false; }

function resetLookup() {
    cancelLookup();
    Object.assign(lookup, { query: '', books: [], searched: false, error: '' });
}

//@lee-hlmilk > load full book details &&& mrt stations before opening edit dialog
async function openEditBook(book) {
    if (!book || ['reserved', 'adopted'].includes(book.status) || loading.value || deleting.value || saving.value) { return; }
    const id = ++bookRequestId;
    const request = getBookDetails(book.id);
    try {
        const [details] = await Promise.all([request, loadStations()]);
        if (id !== bookRequestId) { return; }
        if (['reserved', 'adopted'].includes(details.status)) { return; }
        editingBook.value = details;
        dialogOpen.value = false;
        formOpen.value = true;
    } catch (error) {
        if (bookDetails.get(book.id) === request) { bookDetails.delete(book.id); }
        if (id === bookRequestId) { toast.error(error.message); }
    }
}

//@lee-hlmilk > form emits prepared fields > view sends POST for add ||| PATCH for edit
async function saveBook(data, keepAdding) {
    if (saving.value) { return; }
    const editing = Boolean(editingBook.value);
    saving.value = true;
    try {
        const response = await api(editing ? `/admin/books/${editingBook.value.id}` : '/admin/books', {
            method: editing ? 'PATCH' : 'POST',
            body: data
        });
        const updated = response.book;
        if (selectedBook.value?.id === updated.id) { selectedBook.value = formatBook(updated); }
        if (keepAdding) { bookFormDialog.value.resetForm(); }
        else { formOpen.value = false; }
        toast.success(response.message || (editing ? 'Book updated' : 'Book added'));
        //@lee-hlmilk > reload so changed titles &&& subjects respect current filters &&& page order
        await fetchBooks();
    } catch (error) { toast.error(error.message); }
    finally { saving.value = false; }
}

//@lee-hlmilk > backend creates one copy per request > return successful result IDs so retry only includes failed books
async function importBooks(booksToAdd) {
    if (saving.value || !booksToAdd.length) { return; }
    saving.value = true;
    const completed = [];
    const failures = [];
    try {
        for (const book of booksToAdd) {
            try {
                await api('/admin/books', { method: 'POST', body: book.data });
                completed.push(book.id);
            } catch (error) { failures.push(`${book.data.title}: ${error.message}`); }
        }
        importedIds.value = completed;
        if (completed.length === booksToAdd.length) { formOpen.value = false; }
        if (completed.length) {
            toast.success(`${completed.length} ${completed.length === 1 ? 'book added' : 'books added'}`);
            await fetchBooks();
        }
        if (failures.length) { toast.error(`${failures.length} ${failures.length === 1 ? 'book could' : 'books could'} not be added`, { description: failures.join('\n'), style: { whiteSpace: 'pre-line' } }); }
    } finally { saving.value = false; }
}

//@lee-hlmilk > same display fields for inventory rows &&& saved details > raw metadata stays available
function formatBook(book) {
    return {
        ...book,
        title: book.title || 'Untitled',
        author: book.authors?.join(', ') || book.author || 'Unknown Author',
        isbn: book.isbn || '—',
        status: (book.status || 'available').toLowerCase(),
        cover: book.thumbnailurl || book.coverurl || ''
    };
}

async function fetchBooks() {
    const id = ++requestId;
    //@1ejun6 > refresh details cache when inventory page \ filters change
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
                search: filters.search,
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
        books.value = response.books.map(formatBook);
    } catch (error) {
        if (id !== requestId) { return; }
        loadError.value = error.message;
        toast.error(error.message, { action: { label: 'retry', onClick: fetchBooks } });
        books.value = [];
    } finally {
        if (id === requestId) { loading.value = false; }
    }
}

//@lee-hlmilk > snapshot selected copies before deleting > retain available-only checks for single &&& bulk actions
async function deleteBooks() {
    const targets = [...selectedBooks.value];
    const bookids = targets.map(book => book.id);
    if (loading.value || deleting.value || !canSelect.value || !bookids.length) { return; }
    if (deleteBlocked.value) {
        toast.error('Only available books can be deleted.');
        return;
    }
    const titles = targets.map(book => book.title);
    if (!await confirm(`Delete ${targets.length === 1 ? 'book' : 'books'}?`, {
        description: `Selected books and their related applications, appointments, and watchlist entries will be permanently deleted.\n${titles.join('\n')}`,
        actionLabel: 'Delete', destructive: true
    })) { return; }
    if (loading.value || deleting.value || !canSelect.value) { return; }
    if (targets.some(book => books.value.find(row => row.id === book.id)?.status !== 'available')) {
        toast.error('Only available books can be deleted. Select the books again.');
        return;
    }
    deleting.value = true;
    try {
        const { deletedids = [] } = await api('/admin/books', { method: 'DELETE', body: { ids: bookids } });
        for (const id of deletedids) { bookDetails.delete(id); }
        await fetchBooks();
        toast.info(`${deletedids.length} deleted`, {
            description: titles.map((title, index) => `${index + 1}. ${title}`).join('\n'),
            style: { whiteSpace: 'pre-line' }
        });
    } catch (error) { toast.error(error.message); }
    finally { deleting.value = false; }
}

watch(filters, () => {
    selectedIds.value = [];
    if (page.value === 1) { fetchBooks(); }
    else { page.value = 1; }
});

watch(page, fetchBooks, { immediate: true });
watch(formOpen, isOpen => { if (!isOpen) { cancelLookup(); } });

const statusTabs = [
    { value: 'all', label: 'All books' },
    { value: 'available', label: 'Available', status: 'available' },
    { value: 'reserved', label: 'Reserved', status: 'reserved' },
    { value: 'adopted', label: 'Adopted', status: 'adopted' }
];

const columns = [
    { key: 'book', label: 'Book', class: 'w-3/5' },
    { key: 'isbn', label: 'ISBN', class: 'w-1/5' },
    { key: 'status', label: 'Status' }
];
</script>
<template>
    <AdminList title="Book Inventory" description="Manage book records and track their availability."
        v-model:search="filters.search" v-model:tab="filters.status" v-model:selectedIds="selectedIds" v-model:page="page"
        :rows="books" :columns="columns" :tabs="statusTabs" :counts="counts" :loading="loading" :disabled="deleting" :selectable="canSelect"
        :error="loadError" searchPlaceholder="Search by Title, Author, ISBN..."
        emptyTitle="No books in this view" emptyDescription="Try another Status Tab, Genre, Search term"
        :pagination="{ itemLabel: 'books', total, pageSize, pageCount }" @openRow="openBook">
        <template #headerActions>
            <Button :disabled="loading || deleting || saving" @click="openAddBook">Add Book</Button>
        </template>
        <template #filters>
            <select v-model="filters.genre" class="w-full min-w-0 rounded-lg border p-2.5 text-sm leading-4 sm:w-auto">
                <option value="all">All genres</option>
                <option v-for="genre in availableGenres" :key="genre" :value="genre">{{ genre }}</option>
            </select>
        </template>
        <template #selectionActions="{ onlyOne }">
            <p v-if="deleteBlocked" class="text-sm text-muted-foreground" role="status">Only available books can be deleted.</p>
            <!--@lee-hlmilk > open edit dialog for selected book-->
            <Button size="sm" class="bg-card" :disabled="!onlyOne || ['reserved', 'adopted'].includes(selectedRow?.status)"
                @click="openEditBook(selectedRow)">Edit</Button>
            <Button variant="destructive" size="sm" :disabled="loading || deleting || deleteBlocked" @click="deleteBooks">{{ deleting ?
                'Deleting…' : 'Delete' }}</Button>
        </template>
        <template #cellBook="{ row }">
            <BookIdentity :title="row.title" :author="row.author" :cover="row.cover" />
        </template>
        <template #cellIsbn="{ value }">
            <span class="text-xs text-muted-foreground">{{ value }}</span>
        </template>
        <template #cellStatus="{ value }">
            <StatusBadge :status="value" />
        </template>
    </AdminList>
    <BookDetailsDialog v-model:open="dialogOpen" :book="selectedBook" @edit="openEditBook" />

    <BookFormDialog ref="bookFormDialog" v-model:open="formOpen" v-model:query="lookup.query"
        :book="editingBook" :stations="stations" :lookup="lookup" :submitting="saving" :importedIds="importedIds"
        @search="searchBooks" @select="cancelLookup" @submit="saveBook" @import="importBooks" />
</template>
