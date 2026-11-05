<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import AppStationSelect from '@/components/shared/AppStationSelect.vue';
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
const emit = defineEmits(['update:query', 'search', 'select', 'submit']);
//@lee-hlmilk > form owns the shared draft > selection &&& locations survive switching import steps
//@lee-hlmilk > toRefs keeps writes linked to props.draft > this intentionally edits BookFormDialog's draft, not saved API records
const { selectedIds, addedIds, reviewBooks, reviewing, invalidIds } = toRefs(props.draft);
//@lee-hlmilk > search results have no database ID > index identifies a result for this lookup only
const results = computed(() => props.lookup.books.map((book, id) => ({ ...book, id })).filter(book => !addedIds.value.includes(book.id)));
const rows = computed(() => reviewing.value ? reviewBooks.value : results.value);
const canImport = computed(() => !props.submitting && reviewBooks.value.length > 0 && reviewBooks.value.every(book => book.mrtstationid));
const columns = computed(() => [
    { key: 'book', label: 'Book' },
    { key: 'isbn', label: 'ISBN', class: 'w-36' },
    { key: 'publicationyear', label: 'First publication', class: 'w-28' },
    ...(reviewing.value ? [
        { key: 'mrtstationid', label: 'Collection area', class: 'w-48' },
        { key: 'actions', label: '', class: 'w-16' }
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
    <form novalidate @submit.prevent="reviewing ? submitBooks($event) : emit('search')">
        <fieldset :disabled="props.submitting" class="min-w-0 space-y-5">
            <h2 v-if="reviewing">Choose collection locations</h2>
            <p v-else class="text-sm text-muted-foreground">Search Open Library and select the books to add</p>
            <p v-if="reviewing" class="text-muted-foreground">Check the selected books against the physical copies. Choose an MRT station for each book before adding them.</p>
            <Field v-else>
                <FieldLabel for="book-search" class="sr-only">Search by title, author or ISBN</FieldLabel>
                <div class="flex min-w-0 items-center overflow-hidden rounded-lg border focus-within:ring-2 focus-within:ring-ring">
                    <Input id="book-search" :modelValue="props.query" type="search" class="flex-1 border-0"
                        placeholder="Search by title, author or ISBN" :clearButtonClass="props.query ? '' : 'hidden'"
                        @update:modelValue="emit('update:query', $event)" />
                    <Button type="submit" class="shrink-0 rounded-none border-0" title="Search" :disabled="props.lookup.loading || !props.query.trim()" :loading="props.lookup.loading"><AppIcon name="search" /><span class="sr-only">{{ props.lookup.loading ? 'Searching…' : 'Search' }}</span></Button>
                </div>
            </Field>
            <p v-if="props.lookup.loading" role="status">Searching Open Library…</p>
            <template v-if="props.lookup.loading || props.lookup.searched">
                <div v-if="!props.lookup.loading" class="flex items-center justify-between gap-2.5">
                    <p role="status">{{ reviewing ? `${reviewBooks.length} books to add` : `${results.length} results · ${selectedIds.length} selected` }}</p>
                    <Button v-if="!reviewing" type="button" :disabled="props.lookup.loading || !selectedIds.length" @click="reviewSelection"><AppIcon name="next" />Next</Button>
                </div>
                <!--@lee-hlmilk > share table markup &&& checkbox logic with admin lists > import-specific controls use slots-->
                <AdminTable fitToContainer :rows="rows" :columns="columns" :isLoading="props.lookup.loading" :disabled="props.lookup.loading || props.submitting" :selectedIds="reviewing ? [] : selectedIds"
                    :emptyKey="JSON.stringify([props.query, reviewing])" :emptyTitle="reviewing ? 'No books selected' : 'No matching books'"
                    :emptyDescription="reviewing ? 'Go back to results to choose books to add.' : 'Try another title, author or ISBN, or use Manual entry.'"
                    :selectable="!reviewing && !props.submitting" :selectionColumn="!reviewing" :rowAction="reviewing ? 'none' : 'select'"
                    @selectedRows="selectedIds = $event">
                    <template #cellBook="{ row }"><BookIdentity :title="row.title" :author="row.authors.join(', ')" :cover="row.coverurl" /></template>
                    <template #cellIsbn="{ value }">{{ value || 'Not provided' }}</template>
                    <template #cellPublicationyear="{ value }">{{ value || 'Not provided' }}</template>
                    <template #headerMrtstationid="{ column }">{{ column.label }} <span class="text-destructive" aria-hidden="true">*</span></template>
                    <template #headerActions><span class="sr-only">Actions</span></template>
                    <template #cellMrtstationid="{ row }">
                        <!--@lee-hlmilk > review rows are draft copies > this native v-model stores each copy's station before submission-->
                        <AppStationSelect v-model="row.mrtstationid" :stations="props.stations" required :disabled="props.submitting" :aria-label="`MRT station for ${row.title}`" :aria-invalid="invalidIds.includes(row.id)" @change="invalidIds = invalidIds.filter(id => id !== row.id)" />
                    </template>
                    <template #cellActions="{ row }">
                        <Button type="button" variant="outline" :aria-label="`Remove ${row.title}`" @click.stop="removeBook(row.id)"><AppIcon name="delete" /><span class="sr-only">Remove</span></Button>
                    </template>
                </AdminTable>
            </template>
            <div v-if="reviewing" class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" @click="reviewing = false"><AppIcon name="back" />Back to results</Button>
                <Button type="submit" :disabled="!canImport" :loading="props.submitting"><AppIcon name="add" />{{ props.submitting ? 'Adding…' : `Add ${reviewBooks.length} ${reviewBooks.length === 1 ? 'book' : 'books'}` }}</Button>
            </div>
        </fieldset>
    </form>
</template>
