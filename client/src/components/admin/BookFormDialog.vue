<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import AdminFormDialog from '@/components/admin/AdminFormDialog.vue';
import BookImportSelection from '@/components/admin/BookImportSelection.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

//@lee-hlmilk > view supplies saved book &&& lookup results > this component owns draft &&& emits actions
const props = defineProps({
    book: { type: Object, default: null },
    stations: { type: Array, default: () => [] },
    lookup: { type: Object, required: true },
    submitting: { type: Boolean, default: false },
    importedIds: { type: Array, default: () => [] }
});
const open = defineModel('open', { type: Boolean, default: false });
const query = defineModel('query', { type: String, default: '' });
const emit = defineEmits(['submit', 'search', 'select', 'import']);
const initialForm = ref('');
const addMode = ref('search');
const invalidFields = ref([]);
const metadataOpen = ref(false);
const importDraft = reactive({ selectedIds: [], addedIds: [], reviewBooks: [], reviewing: false, invalidIds: [] });
//@lee-hlmilk > reactive draft state for editing book metadata
const bookForm = reactive({title: '', authors: '', condition: '', mrtstationid: '', description: '', isbn: '', publicationyear: '', subject: '', openlibraryid: '', coverurl: ''});
const isFormDirty = computed(() => importDraft.selectedIds.length > 0 || JSON.stringify(bookForm) !== initialForm.value);
//@lee-hlmilk > keep current station in list even if no longer selectable for new writes
const stationOptions = computed(() => {
    const current = props.book?.mrtstation;
    if (current?.id && !props.stations.some(station => station.id === current.id)) {
        return [current, ...props.stations];
    }
    return props.stations;
});

//@lee-hlmilk > populate edit form fields from the saved book
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

function enterManually() {
    emit('select'); //@lee-hlmilk > invalidate pending lookup before switching to manual entry
    importDraft.selectedIds = [];
    addMode.value = 'manual';
    fillBookForm({});
}

//@lee-hlmilk > add &&& continue resets the manual draft after a successful save
function resetForm() {
    fillBookForm(props.book || {});
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
        ...(!props.book ? { source: 'manual' } : {}),
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
        Object.assign(importDraft, { selectedIds: [], addedIds: [], reviewBooks: [], reviewing: false, invalidIds: [] });
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
        :contentClass="!props.book && addMode === 'search' ? 'max-w-5xl flex flex-col overflow-hidden' : null"
        :bodyClass="!props.book && addMode === 'search' ? 'flex min-h-0 flex-col' : null"
        :hideForm="!props.book && addMode === 'search'"
        :showFooterSeparator="!props.book"
        :submitting="props.submitting" :dirty="isFormDirty" noValidate @submit="submitBook">
        <template v-if="!props.book" #top>
            <BookImportSelection v-if="addMode === 'search'" v-model:query="query" :lookup="props.lookup" :draft="importDraft"
                :stations="props.stations" :submitting="props.submitting" :importedIds="props.importedIds"
                @search="emit('search')" @select="emit('select')" @manual="enterManually" @submit="emit('import', $event)" />
            <p v-else class="text-muted-foreground">Enter the book details below.</p>
        </template>
        <template v-if="!props.book" #extraActions>
            <Button type="submit" value="continue" variant="outline" :disabled="props.submitting">Add and continue</Button>
        </template>
        <template v-if="props.book" #footer>
            <Button type="submit" class="w-full" :disabled="props.submitting">{{ props.submitting ? 'Saving…' : 'Save changes' }}</Button>
        </template>
        <div class="flex items-center justify-between gap-2.5 text-xs">
            <p class="text-muted-foreground"><span class="text-destructive" aria-hidden="true">*</span> Required</p>
            <StatusBadge v-if="props.book" :status="props.book.status" />
        </div>
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

    </AdminFormDialog>
</template>
