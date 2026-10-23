<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import AdminFormDialog from '@/components/admin/AdminFormDialog.vue';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

//@lee-hlmilk > view supplies saved book &&& lookup results > this component owns draft &&& emits actions
const props = defineProps({
    book: { type: Object, default: null },
    stations: { type: Array, default: () => [] },
    lookup: { type: Object, required: true },
    submitting: { type: Boolean, default: false }
});
const open = defineModel('open', { type: Boolean, default: false });
const query = defineModel('query', { type: String, default: '' });
const emit = defineEmits(['submit', 'search', 'select']);
const initialForm = ref('');
const addMode = ref('search');
const invalidFields = ref([]);
const metadataOpen = ref(false);
//@lee-hlmilk > reactive draft state for editing book metadata
const bookForm = reactive({title: '', authors: '', condition: '', mrtstationid: '', description: '', isbn: '', publicationyear: '', subject: '', openlibraryid: '', coverurl: ''});
//@lee-hlmilk > compare draft with opening snapshot > reverting all fields removes unsaved changes prompt
const isFormDirty = computed(() => open.value && JSON.stringify(bookForm) !== initialForm.value);
//@lee-hlmilk > keep current station in list even if no longer selectable for new writes
const stationOptions = computed(() => {
    const current = props.book?.mrtstation;
    if (current?.id && !props.stations.some(station => station.id === current.id)) {
        return [current, ...props.stations];
    }
    return props.stations;
});

//@lee-hlmilk > populate edit form fields &&& snapshot initial state for dirty check
function fillBookForm(book) {
    Object.assign(bookForm, {
        title: book.title || '',
        authors: (book.authors || []).join(', '),
        condition: book.condition || '',
        mrtstationid: book.mrtstationid || '',
        description: book.description || '',
        isbn: book.isbn || '',
        publicationyear: book.publicationyear ?? '',
        subject: book.subjects?.[0] || '', //@lee-hlmilk > form accepts one subject > use first when existing metadata has several
        openlibraryid: book.openlibraryid || '',
        coverurl: book.coverurl || ''
    });
    initialForm.value = JSON.stringify(bookForm);
    invalidFields.value = [];
    metadataOpen.value = false;
}

function selectBook(book = null) {
    emit('select'); //@lee-hlmilk > view invalidates pending lookup before switching to manual entry ||| selected metadata
    addMode.value = book ? 'review' : 'manual';
    fillBookForm(book || {});
}

//@lee-hlmilk > add &&& continue keeps manual mode > imported copy returns to existing search results
function resetForm() {
    fillBookForm(props.book || {});
    if (addMode.value === 'review') { addMode.value = 'search'; }
}

function submitBook(event) {
    if (props.submitting || (!props.book && addMode.value === 'search')) { return; }
    const form = event.target;
    //@lee-hlmilk > noValidate allows submit event > still use native required &&& pattern &&& number validity
    invalidFields.value = Array.from(form.elements)
        .filter(field => field.willValidate && !field.validity.valid).map(field => field.id);
    if (invalidFields.value.length) {
        if (invalidFields.value.includes('edit-subject') || invalidFields.value.includes('edit-year')) {
            metadataOpen.value = true;
        }
        toast.error('Please check the highlighted fields. Title and collection area are required; enter only one subject.');
        //@lee-hlmilk > wait for red borders &&& metadata section to render before focusing first invalid field
        nextTick(() => form.querySelector('[aria-invalid="true"]')?.focus());
        return;
    }
    const data = {
        ...(!props.book ? { source: addMode.value === 'review' ? 'open_library' : 'manual' } : {}),
        title: bookForm.title,
        authors: bookForm.authors,
        condition: bookForm.condition || null,
        mrtstationid: bookForm.mrtstationid,
        description: bookForm.description.trim(),
        isbn: bookForm.isbn,
        publicationyear: bookForm.publicationyear,
        subjects: bookForm.subject, //@lee-hlmilk > map single subject field to API name > backend trims &&& converts to array
        openlibraryid: bookForm.openlibraryid,
        coverurl: bookForm.coverurl
    };
    //@lee-hlmilk > submitter identifies Add and continue > view saves data before resetting ||| closing form
    emit('submit', data, !props.book && event?.submitter?.value === 'continue');
}

//@lee-hlmilk > clear only the corrected field > other invalid borders remain visible
function clearInvalid(event) {
    const field = event.target;
    if (field.validity.valid) {
        invalidFields.value = invalidFields.value.filter(id => id !== field.id);
    }
}

//@lee-hlmilk > reopening starts a fresh draft from saved book ||| blank fields > failed saves keep current draft
watch(open, isOpen => {
    if (isOpen) {
        addMode.value = 'search';
        resetForm();
    }
}, { immediate: true });

defineExpose({ resetForm }); //@lee-hlmilk > parent calls through template ref only after a successful Add and continue
</script>
<template>
    <!--@lee-hlmilk > edit book dialog form-->
    <AdminFormDialog v-model:open="open" :title="props.book ? 'Edit book' : 'Add book'"
        :description="props.book ? 'Availability follows approvals and collection.' : 'Add a record for a physical copy received. Review the metadata before saving.'"
        :submitLabel="props.book ? 'Save changes' : 'Add book'"
        :submittingLabel="props.book ? 'Saving…' : 'Adding…'"
        :hideForm="!props.book && addMode === 'search'"
        :submitting="props.submitting" :dirty="isFormDirty" noValidate @submit="submitBook">
        <template v-if="!props.book" #top>
            <section v-if="addMode === 'search'" class="space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-2.5">
                    <h2>Find on Open Library</h2>
                    <Button type="button" variant="outline" @click="selectBook()">Enter manually</Button>
                </div>
                <form @submit.prevent="emit('search')">
                    <Field>
                        <FieldLabel for="book-search">Search by title, author or ISBN</FieldLabel>
                        <Input id="book-search" v-model="query" type="search" required />
                    </Field>
                    <Button type="submit" :disabled="props.lookup.loading">{{ props.lookup.loading ? 'Searching…' : 'Search' }}</Button>
                </form>
                <p v-if="props.lookup.loading" role="status">Searching Open Library…</p>
                <div v-else-if="props.lookup.error" class="space-y-2.5" role="alert">
                    <p>{{ props.lookup.error }}</p>
                    <Button type="button" variant="outline" @click="emit('search')">Retry</Button>
                </div>
                <div v-else-if="props.lookup.searched" class="space-y-2.5">
                    <p role="status">{{ props.lookup.books.length }} results</p>
                    <p v-if="!props.lookup.books.length" class="text-muted-foreground">Try another title, author or ISBN, or enter the book manually.</p>
                    <div v-for="(book, index) in props.lookup.books" :key="index"
                        class="flex items-center gap-2.5 rounded-lg border p-2.5">
                        <div class="min-w-0 flex-1 space-y-2.5">
                            <BookIdentity :title="book.title" :author="book.authors.join(', ')" :cover="book.coverurl" />
                            <p class="text-xs text-muted-foreground">{{ book.publicationyear || 'Year not provided' }} · {{ book.isbn || 'ISBN not provided' }}</p>
                        </div>
                        <Button type="button" size="sm" @click="selectBook(book)">Select</Button>
                    </div>
                </div>
            </section>
            <p v-else class="text-muted-foreground">{{ addMode === 'review' ? 'Check the selected metadata against the physical book. ISBNs can vary by edition.' : 'Enter the book details below.' }}</p>
        </template>
        <template v-if="!props.book" #extraActions>
            <Button type="submit" value="continue" variant="outline" :disabled="props.submitting">Add and continue</Button>
        </template>
        <p class="text-xs text-muted-foreground"><span class="text-destructive" aria-hidden="true">*</span> Required</p>
        <div class="grid gap-5 sm:grid-cols-2">
            <Field class="sm:col-span-2">
                <FieldLabel for="edit-title">Title <span class="text-destructive" aria-hidden="true">*</span></FieldLabel>
                <Input id="edit-title" v-model="bookForm.title" required pattern=".*\S.*"
                    :aria-invalid="invalidFields.includes('edit-title')" @input="clearInvalid" />
            </Field>
            <Field class="sm:col-span-2">
                <FieldLabel for="edit-authors">Authors (comma separated)</FieldLabel>
                <Input id="edit-authors" v-model="bookForm.authors" />
            </Field>
            <Field>
                <FieldLabel for="edit-condition">Condition</FieldLabel>
                <select id="edit-condition" v-model="bookForm.condition"
                    class="h-9 w-full min-w-0 rounded-lg border bg-background px-3 text-sm">
                    <option value="">Not specified</option>
                    <option value="like new">Like new</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                </select>
            </Field>
            <Field>
                <FieldLabel for="edit-station">Collection area (MRT station) <span class="text-destructive" aria-hidden="true">*</span></FieldLabel>
                <select id="edit-station" v-model="bookForm.mrtstationid" required
                    :aria-invalid="invalidFields.includes('edit-station')" @change="clearInvalid"
                    class="h-9 w-full min-w-0 rounded-lg border bg-background px-3 text-sm">
                    <option value="" disabled>Select an MRT station</option>
                    <option v-for="station in stationOptions" :key="station.id" :value="station.id">
                        {{ station.name }}
                    </option>
                </select>
            </Field>
            <Field class="sm:col-span-2">
                <FieldLabel for="edit-description">Description</FieldLabel>
                <textarea id="edit-description" v-model="bookForm.description" rows="3"
                    class="w-full min-w-0 rounded-lg border bg-background p-2.5 text-sm" />
            </Field>
        </div>

        <!--@lee-hlmilk > collapsible secondary book metadata fields-->
        <details :open="metadataOpen" class="rounded-lg border p-2.5" @toggle="metadataOpen = $event.target.open">
            <summary class="cursor-pointer text-sm">ISBN and other metadata</summary>
            <div class="mt-5 grid gap-5 sm:grid-cols-2">
                <Field>
                    <FieldLabel for="edit-isbn">ISBN</FieldLabel>
                    <Input id="edit-isbn" v-model="bookForm.isbn" />
                </Field>
                <Field>
                    <FieldLabel for="edit-year">First publication year</FieldLabel>
                    <Input id="edit-year" v-model="bookForm.publicationyear" type="number" step="1"
                        :aria-invalid="invalidFields.includes('edit-year')" @input="clearInvalid" />
                </Field>
                <Field class="sm:col-span-2">
                    <FieldLabel for="edit-subject">Subject</FieldLabel>
                    <Input id="edit-subject" v-model="bookForm.subject" pattern="[^,]+" title="Enter one subject without commas."
                        :aria-invalid="invalidFields.includes('edit-subject')" @input="clearInvalid" />
                </Field>
                <Field>
                    <FieldLabel for="edit-olid">Open Library ID</FieldLabel>
                    <Input id="edit-olid" v-model="bookForm.openlibraryid" />
                </Field>
                <Field>
                    <FieldLabel for="edit-cover">Cover URL</FieldLabel>
                    <Input id="edit-cover" v-model="bookForm.coverurl" />
                </Field>
            </div>
        </details>

        <div v-if="props.book" class="flex items-center gap-2.5 text-xs text-muted-foreground">
            <StatusBadge :status="props.book.status" />
            <span>Current copy status</span>
        </div>
    </AdminFormDialog>
</template>
