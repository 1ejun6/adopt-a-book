<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { useFormValidation } from '@/composables/useFormValidation';
import { withCurrentStation } from '@/lib/stations';
import AdminFormDialog from '@/components/admin/AdminFormDialog.vue';
import BookImportSelection from '@/components/admin/BookImportSelection.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import genres from '../../../../shared/genres.json';

//@lee-hlmilk > view supplies saved book &&& lookup results > this component owns draft &&& emits actions
const props = defineProps({
    book: { type: Object, default: null },
    stations: { type: Array, default: () => [] },
    lookup: { type: Object, required: true },
    submitting: { type: Boolean, default: false },
    uploadingCover: { type: Boolean, default: false },
    importedIds: { type: Array, default: () => [] }
});
//@lee-hlmilk > open &&& query sync with inventory > bookForm &&& importDraft remain local drafts until submit
const open = defineModel('open', { type: Boolean, default: false });
const query = defineModel('query', { type: String, default: '' });
const emit = defineEmits(['submit', 'search', 'select', 'import']);
const initialForm = ref('');
const addMode = ref('search');
const { invalidFields, validate, clearInvalid, focusInvalid, resetValidation } = useFormValidation();
const metadataOpen = ref(false);
const coverFile = ref(null);
const coverPreview = ref('');
const coverInput = ref(null);
const coverError = ref('');
const checkingCover = ref(false);
const submittingLabel = computed(() => checkingCover.value ? 'Checking photo…' : props.uploadingCover ? 'Uploading photo…' : props.book ? 'Saving…' : 'Adding…');
let coverRequestId = 0;
const importDraft = reactive({ selectedIds: [], addedIds: [], reviewBooks: [], reviewing: false, invalidIds: [] });
//@lee-hlmilk > reactive draft state for editing book metadata
const bookForm = reactive({title: '', authors: '', condition: '', mrtstationid: '', description: '', isbn: '', publicationyear: '', subject: '', openlibraryid: '', coverurl: ''});
const isFormDirty = computed(() => checkingCover.value || Boolean(coverFile.value) || importDraft.selectedIds.length > 0 || JSON.stringify(bookForm) !== initialForm.value);
//@lee-hlmilk > keep current station in list even if no longer selectable for new writes
const stationOptions = computed(() => withCurrentStation(props.stations, props.book?.mrtstation));

//@lee-hlmilk > populate edit form fields from the saved book
function fillBookForm(book) {
    resetCoverFile();
    Object.assign(bookForm, {
        title: book.title || '',
        authors: (book.authors || []).join(', '),
        condition: book.condition || '',
        mrtstationid: book.mrtstationid || '',
        description: book.description || '',
        isbn: book.isbn || '',
        publicationyear: book.publicationyear ?? '',
        subject: book.subjects?.find(item => genres.includes(item)) || '', //@lee-hlmilk > form accepts one subject > use first matching static genre
        openlibraryid: book.openlibraryid || '',
        coverurl: book.coverurl || ''
    });
    initialForm.value = JSON.stringify(bookForm);
    resetValidation();
    metadataOpen.value = false;
}

//@lee-hlmilk > local preview only > inventory uploads the File after the form passes validation
async function selectCover(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) { return; }
    const id = ++coverRequestId;
    coverError.value = '';
    checkingCover.value = false;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { rejectCover('Choose a JPG, PNG or WebP image.'); return; }
    if (!file.size) { rejectCover('This photo is empty. Choose another file.'); return; }
    if (file.size > 5 * 1024 * 1024) { rejectCover('This photo exceeds 5 MB. Choose a smaller file.'); return; }
    const preview = URL.createObjectURL(file);
    checkingCover.value = true;
    try {
        const image = new Image();
        image.src = preview;
        await image.decode();
        if (id !== coverRequestId || !open.value) { return; }
        //@lee-hlmilk > commit only a readable replacement > invalid images leave the current photo untouched
        if (coverPreview.value) { URL.revokeObjectURL(coverPreview.value); }
        coverFile.value = file;
        coverPreview.value = preview;
    } catch {
        if (id === coverRequestId) { rejectCover('This photo could not be opened. Choose a different JPG, PNG or WebP image.'); }
    } finally {
        if (preview !== coverPreview.value) { URL.revokeObjectURL(preview); }
        if (id === coverRequestId) { checkingCover.value = false; }
    }
}

function rejectCover(message) { coverError.value = message; toast.error(message); }

function resetCoverFile() {
    coverRequestId++;
    coverError.value = '';
    checkingCover.value = false;
    if (coverPreview.value) { URL.revokeObjectURL(coverPreview.value); }
    if (coverInput.value) { coverInput.value.value = ''; }
    coverFile.value = null;
    coverPreview.value = '';
}

function removeCover() { resetCoverFile(); bookForm.coverurl = ''; }
onBeforeUnmount(resetCoverFile);

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
    if (props.submitting || checkingCover.value || (!props.book && addMode.value === 'search')) { return; }
    const form = event.target;
    //@lee-hlmilk > noValidate allows submit event > still use native required &&& pattern &&& number validity
    if (!validate(form)) {
        if (invalidFields.value.includes('edit-year')) {
            metadataOpen.value = true;
        }
        toast.error('Please check the highlighted fields. Title, collection area and subject are required.');
        focusInvalid(form);
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
    emit('submit', data, !props.book && event?.submitter?.value === 'continue', coverFile.value);
}

//@lee-hlmilk > reopening starts a fresh draft from saved book ||| blank fields > failed saves keep current draft
watch(open, isOpen => {
    if (isOpen) {
        addMode.value = 'search';
        Object.assign(importDraft, { selectedIds: [], addedIds: [], reviewBooks: [], reviewing: false, invalidIds: [] });
        resetForm();
    } else { resetCoverFile(); }
}, { immediate: true });

defineExpose({ resetForm }); //@lee-hlmilk > parent calls through template ref only after a successful Add and continue
</script>
<template>
    <!--@lee-hlmilk > edit book dialog form-->
    <AdminFormDialog v-model:open="open" :title="props.book ? 'Edit book' : 'Add book'"
        submitLabel="Add book" :submittingLabel="submittingLabel"
        :contentClass="!props.book && addMode === 'search' ? 'max-w-5xl' : null"
        :hideForm="!props.book && addMode === 'search'"
        :showFooterSeparator="!props.book"
        :submitting="props.submitting || checkingCover" :dirty="isFormDirty" noValidate @submit="submitBook">
        <template v-if="!props.book" #top>
            <!--@lee-hlmilk > relay query updates &&& lookup actions > import submission becomes the view's import event-->
            <BookImportSelection v-if="addMode === 'search'" v-model:query="query" :lookup="props.lookup" :draft="importDraft"
                :stations="props.stations" :submitting="props.submitting" :importedIds="props.importedIds"
                @search="emit('search')" @select="emit('select')" @manual="enterManually" @submit="emit('import', $event)" />
        </template>
        <template v-if="!props.book" #extraActions>
            <Button type="submit" value="continue" variant="outline" :disabled="props.submitting || checkingCover">Add and continue</Button>
        </template>
        <template v-if="props.book" #footer>
            <Button type="submit" class="w-full " :disabled="props.submitting || checkingCover">{{ props.submitting || checkingCover ? submittingLabel : 'Save changes' }}</Button>
        </template>
        <div class="flex items-center justify-between gap-2.5 text-xs">
            <p class="text-muted-foreground"><span class="text-destructive" aria-hidden="true">*</span> Required</p>
            <StatusBadge v-if="props.book" :status="props.book.status" />
        </div>
        <!--@lee-hlmilk > grid gap separates fields > Field supplies label/control spacing > wide fields span both sm columns-->
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
            <Field class="min-w-0 sm:col-span-2">
                <FieldLabel for="edit-cover-file">Cover photo</FieldLabel>
                <input id="edit-cover-file" ref="coverInput" type="file" accept="image/jpeg,image/png,image/webp" :disabled="props.submitting"
                    class="hidden" aria-describedby="cover-photo-help cover-file-help" @change="selectCover" />
                <!--@lee-hlmilk > group photo actions with the uncropped preview > keep native chooser text out of the layout-->
                <div class="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                    <img v-if="coverPreview || bookForm.coverurl" :src="coverPreview || bookForm.coverurl" alt="Preview of the book’s front cover"
                        class="h-36 w-24 shrink-0 self-start object-contain" />
                    <div class="min-w-0 flex-1 space-y-2.5">
                        <div class="flex flex-wrap gap-2.5">
                            <Button type="button" variant="outline" :disabled="props.submitting"
                                :aria-describedby="coverError ? 'cover-photo-help cover-file-help cover-photo-error' : 'cover-photo-help cover-file-help'"
                                :aria-invalid="Boolean(coverError)" @click="coverInput?.click()">{{ coverPreview || bookForm.coverurl ? 'Change photo' : 'Choose photo' }}</Button>
                            <Button v-if="coverPreview || bookForm.coverurl" type="button" variant="outline" :disabled="props.submitting" @click="removeCover">Remove photo</Button>
                        </div>
                        <p v-if="coverFile" :title="coverFile.name" class="truncate text-sm text-muted-foreground">{{ coverFile.name }}</p>
                        <p v-if="checkingCover" role="status" class="text-sm text-muted-foreground">Checking photo…</p>
                        <p v-else-if="props.uploadingCover" role="status" class="text-sm text-muted-foreground">Uploading photo…</p>
                        <p v-else-if="coverFile" class="text-sm text-muted-foreground">Photo will be saved when you save the book.</p>
                    </div>
                </div>
                <p id="cover-file-help" class="text-sm text-muted-foreground">JPG, PNG or WebP · Maximum 5 MB</p>
                <p v-if="coverError" id="cover-photo-error" role="alert" class="text-sm text-destructive">{{ coverError }}</p>
            </Field>
            <Field class="sm:col-span-2">
                <FieldLabel for="edit-subject">Subject <span class="text-destructive" aria-hidden="true">*</span></FieldLabel>
                <select id="edit-subject" v-model="bookForm.subject" required
                    :aria-invalid="invalidFields.includes('edit-subject')" @change="clearInvalid"
                    class="w-full min-w-0 rounded-lg border px-3 text-base min-h-11">
                    <option value="" disabled>Select a subject</option>
                    <option v-for="genre in genres" :key="genre" :value="genre">{{ genre }}</option>
                </select>
            </Field>
            <Field>
                <FieldLabel for="edit-condition">Condition</FieldLabel>
                <select id="edit-condition" v-model="bookForm.condition"
                    class="w-full min-w-0 rounded-lg border px-3 text-base min-h-11">
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
                    class="w-full min-w-0 rounded-lg border px-3 text-base min-h-11">
                    <option value="" disabled>Select an MRT station</option>
                    <option v-for="station in stationOptions" :key="station.id" :value="station.id">
                        {{ station.name }}
                    </option>
                </select>
            </Field>
            <Field class="sm:col-span-2">
                <FieldLabel for="edit-description">Description</FieldLabel>
                <textarea id="edit-description" v-model="bookForm.description" rows="3"
                    class="w-full min-w-0 rounded-lg border p-2.5 text-base" />
            </Field>
        </div>

        <!--@lee-hlmilk > collapsible secondary book metadata fields-->
        <details :open="metadataOpen" class="border p-2.5" @toggle="metadataOpen = $event.target.open">
            <summary class="cursor-pointer">ISBN and other metadata</summary>
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
                <Field>
                    <FieldLabel for="edit-olid">Open Library ID</FieldLabel>
                    <Input id="edit-olid" v-model="bookForm.openlibraryid" />
                </Field>
                <Field>
                    <FieldLabel for="edit-cover">Cover URL</FieldLabel>
                    <Input id="edit-cover" v-model="bookForm.coverurl" :disabled="Boolean(coverFile) || props.submitting" />
                </Field>
            </div>
        </details>

    </AdminFormDialog>
</template>
