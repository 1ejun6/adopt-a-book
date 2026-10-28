<script setup>
import { computed, nextTick, toRefs, watch } from 'vue';
import { toast } from 'vue-sonner';
import AdminTable from '@/components/admin/AdminTable.vue';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';

//@lee-hlmilk > lookup &&& saving belong to inventory > selection &&& per-copy station drafts stay here
const props = defineProps({
    query: { type: String, default: '' },
    lookup: { type: Object, required: true },
    draft: { type: Object, required: true },
    stations: { type: Array, default: () => [] },
    submitting: { type: Boolean, default: false },
    importedIds: { type: Array, default: () => [] }
});
const emit = defineEmits(['update:query', 'search', 'select', 'manual', 'submit']);
//@lee-hlmilk > form owns the shared draft > selection &&& locations survive switching import steps
//@lee-hlmilk > toRefs keeps writes linked to props.draft > this intentionally edits BookFormDialog's draft, not saved API records
const { selectedIds, addedIds, reviewBooks, reviewing, invalidIds } = toRefs(props.draft);
//@lee-hlmilk > search results have no database ID > index identifies a result for this lookup only
const results = computed(() => props.lookup.books.map((book, id) => ({ ...book, id })).filter(book => !addedIds.value.includes(book.id)));
const rows = computed(() => reviewing.value ? reviewBooks.value : results.value);
const canImport = computed(() => !props.submitting && reviewBooks.value.length > 0 && reviewBooks.value.every(book => book.mrtstationid));
const columns = computed(() => [
    { key: 'book', label: 'Book' },
    { key: 'isbn', label: 'ISBN', class: 'w-44' },
    { key: 'publicationyear', label: 'First publication', class: 'w-36' },
    ...(reviewing.value ? [
        { key: 'mrtstationid', label: 'Collection area', class: 'w-56' },
        { key: 'actions', label: '', class: 'w-24' }
    ] : [])
]);

//@lee-hlmilk > remove only the draft selection > book stays in search results if admin wants to select it again
function removeBook(id) {
    if (props.submitting) { return; }
    reviewBooks.value = reviewBooks.value.filter(book => book.id !== id);
    selectedIds.value = selectedIds.value.filter(value => value !== id);
    invalidIds.value = invalidIds.value.filter(value => value !== id);
}

function reviewSelection() {
    if (!selectedIds.value.length || props.lookup.loading) { return; }
    emit('select');
    //@lee-hlmilk > going back to results preserves station choices for books that remain selected
    reviewBooks.value = results.value.filter(book => selectedIds.value.includes(book.id)).map(book =>
        reviewBooks.value.find(draft => draft.id === book.id) || { ...book, mrtstationid: '' }
    );
    invalidIds.value = [];
    reviewing.value = true;
}

function submitBooks(event) {
    if (props.submitting || !reviewBooks.value.length) { return; }
    invalidIds.value = reviewBooks.value.filter(book => !book.mrtstationid).map(book => book.id);
    if (invalidIds.value.length) {
        toast.error('Choose an MRT station for each highlighted book.');
        nextTick(() => event.target.querySelector('[aria-invalid="true"]')?.focus());
        return;
    }
    //@lee-hlmilk > omit local result IDs from payload > backend handles metadata normalisation &&& description lookup
    emit('submit', reviewBooks.value.map(({ id, mrtstationid, title, authors, isbn, subjects, publicationyear, description, coverurl, openlibraryid }) => ({
        id, data: { source: 'open_library', mrtstationid, title, authors, isbn, subjects, publicationyear, description, coverurl, openlibraryid }
    })));
}

watch(() => props.lookup.books, () => {
    selectedIds.value = [];
    addedIds.value = [];
    reviewBooks.value = [];
    reviewing.value = false;
});
//@lee-hlmilk > remove successful imports from both steps > failed copies retain their station choices for retry
watch(() => props.importedIds, ids => {
    addedIds.value.push(...ids);
    selectedIds.value = selectedIds.value.filter(id => !ids.includes(id));
    reviewBooks.value = reviewBooks.value.filter(book => !ids.includes(book.id));
});
</script>

<template>
    <form class="flex min-h-0 min-w-0 flex-col gap-5" novalidate @submit.prevent="reviewing ? submitBooks($event) : emit('search')">
        <!--@lee-hlmilk > contents removes the fieldset layout box > disabled still applies to controls while the table can shrink-->
        <fieldset :disabled="props.submitting" class="contents">
            <div class="flex flex-wrap items-center justify-between gap-2.5">
                <h2>{{ reviewing ? 'Choose collection locations' : 'Find on Open Library' }}</h2>
                <Button v-if="!reviewing" type="button" variant="outline" @click="emit('manual')">Enter manually</Button>
            </div>
            <p v-if="reviewing" class="text-muted-foreground">Check the selected books against the physical copies. Choose an MRT station for each book before adding them.</p>
            <Field v-else>
                <FieldLabel for="book-search">Search by title, author or ISBN</FieldLabel>
                <div class="flex items-center gap-2.5">
                    <Input id="book-search" :modelValue="props.query" type="search" class="flex-1"
                        @update:modelValue="emit('update:query', $event)" />
                    <Button type="submit" class="shrink-0" :disabled="props.lookup.loading || !props.query.trim()">{{ props.lookup.loading ? 'Searching…' : 'Search' }}</Button>
                </div>
            </Field>
            <p v-if="props.lookup.loading" role="status">Searching Open Library…</p>
            <template v-else-if="props.lookup.searched">
                <div class="flex items-center justify-between gap-2.5">
                    <p role="status">{{ reviewing ? `${reviewBooks.length} books to add` : `${results.length} results · ${selectedIds.length} selected` }}</p>
                    <Button v-if="!reviewing" type="button" :disabled="props.lookup.loading || !selectedIds.length" @click="reviewSelection">Next</Button>
                </div>
                <!--@lee-hlmilk > only the table scrolls > search &&& navigation stay visible within the dialog-->
                <div class="-m-2.5 min-h-0 overflow-auto p-2.5">
                    <!--@lee-hlmilk > share table markup &&& checkbox logic with admin lists > import-specific controls use slots-->
                    <AdminTable :rows="rows" :columns="columns" :selectedIds="reviewing ? [] : selectedIds"
                        :selectable="!reviewing && !props.submitting" :selectionColumn="!reviewing" :rowAction="reviewing ? 'none' : 'select'"
                        @selectedRows="selectedIds = $event">
                        <template #cellBook="{ row }"><BookIdentity :title="row.title" :author="row.authors.join(', ')" :cover="row.coverurl" /></template>
                        <template #cellIsbn="{ value }">{{ value || 'Not provided' }}</template>
                        <template #cellPublicationyear="{ value }">{{ value || 'Not provided' }}</template>
                        <template #headerMrtstationid="{ column }">{{ column.label }} <span class="text-destructive" aria-hidden="true">*</span></template>
                        <template #headerActions><span class="sr-only">Actions</span></template>
                        <template #cellMrtstationid="{ row }">
                            <!--@lee-hlmilk > review rows are draft copies > this native v-model stores each copy's station before submission-->
                            <select v-model="row.mrtstationid" required :aria-label="`MRT station for ${row.title}`"
                                :aria-invalid="invalidIds.includes(row.id)" class="h-9 w-full min-w-44 rounded-lg border bg-background px-3 text-sm"
                                @change="invalidIds = invalidIds.filter(id => id !== row.id)">
                                <option value="" disabled>Select an MRT station</option>
                                <option v-for="station in props.stations" :key="station.id" :value="station.id">{{ station.name }}</option>
                            </select>
                        </template>
                        <template #cellActions="{ row }">
                            <Button type="button" variant="outline" size="sm" :aria-label="`Remove ${row.title}`" @click.stop="removeBook(row.id)">Remove</Button>
                        </template>
                        <template #empty>
                            <p class="text-muted-foreground">{{ reviewing ? 'No books selected. Go back to results to choose books to add.' : 'Try another title, author or ISBN, or enter the book manually.' }}</p>
                        </template>
                    </AdminTable>
                </div>
            </template>
            <div v-if="reviewing" class="flex items-center justify-between gap-2.5">
                <Button type="button" variant="outline" @click="reviewing = false">Back to results</Button>
                <Button type="submit" :disabled="!canImport">{{ props.submitting ? 'Adding…' : `Add ${reviewBooks.length} ${reviewBooks.length === 1 ? 'book' : 'books'}` }}</Button>
            </div>
        </fieldset>
    </form>
</template>
