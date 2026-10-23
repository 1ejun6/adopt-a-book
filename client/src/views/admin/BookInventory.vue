<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import AdminList from '@/components/admin/AdminList.vue'
import AdminFormDialog from '@/components/admin/AdminFormDialog.vue'
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
const lookup = reactive({ query: '', books: [], loading: false, searched: false, error: '' });
let lookupRequestId = 0;
const selectedIds = ref([]);
const selectedRow = computed(() => books.value.find(book => book.id === selectedIds.value[0]));
const loading = ref(false);
const deleting = ref(false);
const deleteOpen = ref(false);
const pendingDeleteBooks = ref([]);
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
        if (selectedBook.value?.id === updated.id) {
            selectedBook.value = {
                ...updated,
                author: (updated.authors || []).join(', ') || 'Unknown Author',
                cover: updated.coverurl || ''
            };
        }
        if (keepAdding) { bookFormDialog.value.resetForm(); }
        else { formOpen.value = false; }
        toast.success(response.message || (editing ? 'Book updated' : 'Book added'));
        //@lee-hlmilk > reload so changed titles &&& subjects respect current filters &&& page order
        await fetchBooks();
    } catch (error) { toast.error(error.message); }
    finally { saving.value = false; }
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

//@lee-hlmilk > snapshot rows shown in confirmation > later selection changes must not change deletion targets
function requestDeleteBooks() {
    if (loading.value || deleting.value || !selectedIds.value.length) { return; }
    pendingDeleteBooks.value = books.value.filter(book => selectedIds.value.includes(book.id));
    deleteOpen.value = true;
}

async function deleteBooks() {
    const bookids = pendingDeleteBooks.value.map(book => book.id);
    if (loading.value || deleting.value || !bookids.length) { return; }
    const titles = pendingDeleteBooks.value.map(book => book.title);
    deleting.value = true;
    try {
        const { deletedids = [] } = await api('/admin/books', { method: 'DELETE', body: { ids: bookids } });
        deleteOpen.value = false;
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
    { key: 'book', label: 'Book' },
    { key: 'isbn', label: 'ISBN' },
    { key: 'status', label: 'Status' }
];
</script>
<template>
    <AdminList title="Book Inventory" description="organisation copies and community listings from intake to handover"
        v-model:search="filters.search" v-model:tab="filters.status" v-model:selectedIds="selectedIds" v-model:page="page"
        :rows="books" :columns="columns" :tabs="statusTabs" :counts="counts" :loading="loading" :disabled="deleting"
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
            <!--@lee-hlmilk > open edit dialog for selected book-->
            <Button size="sm" class="bg-card" :disabled="!onlyOne || ['reserved', 'adopted'].includes(selectedRow?.status)"
                @click="openEditBook(selectedRow)">Edit</Button>
            <Button variant="destructive" size="sm" :disabled="deleting" @click="requestDeleteBooks">{{ deleting ?
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
    <!--@lee-hlmilk > reuse form shell for confirmation > footer supplies destructive submit action-->
    <AdminFormDialog v-model:open="deleteOpen" :title="`Delete ${pendingDeleteBooks.length} ${pendingDeleteBooks.length === 1 ? 'book' : 'books'}?`"
        description="Selected books and their related applications, appointments, and watchlist entries will be permanently deleted."
        :submitting="deleting" @submit="deleteBooks">
        <ul class="list-disc space-y-2.5 pl-5">
            <li v-for="book in pendingDeleteBooks" :key="book.id">{{ book.title }}</li>
        </ul>
        <template #footer="{ requestClose }">
            <Button type="button" variant="outline" :disabled="deleting" @click="requestClose">Cancel</Button>
            <Button type="submit" variant="destructive" class="flex-1" :disabled="deleting">
                {{ deleting ? 'Deleting…' : pendingDeleteBooks.length === 1 ? 'Delete book' : 'Delete books' }}
            </Button>
        </template>
    </AdminFormDialog>

    <BookFormDialog ref="bookFormDialog" v-model:open="formOpen" v-model:query="lookup.query"
        :book="editingBook" :stations="stations" :lookup="lookup" :submitting="saving"
        @search="searchBooks" @select="cancelLookup" @submit="saveBook" />
</template>
