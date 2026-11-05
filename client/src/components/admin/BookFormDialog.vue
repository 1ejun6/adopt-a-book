<script setup>
import AppTextarea from '@/components/shared/AppTextarea.vue';
import AppIcon from '@/components/shared/AppIcon.vue';
import AppStationSelect from '@/components/shared/AppStationSelect.vue';
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
import AdminTabs from '@/components/admin/AdminTabs.vue';
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
const descriptionWordCount = computed(() => bookForm.description.trim().split(/\s+/u).filter(Boolean).length);
const maxDescriptionWords = 500;

function validateDescription(event) {
    event.target.setCustomValidity(descriptionWordCount.value > maxDescriptionWords ? `Use ${maxDescriptionWords} words or fewer.` : '');
    clearInvalid(event);
}
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

onBeforeUnmount(resetCoverFile);

function selectAddMode(mode) {
    if (props.submitting || checkingCover.value) { return; }
    if (mode === 'manual') { emit('select'); }
    addMode.value = mode;
}

// Reset only when opening a fresh draft.
function resetForm() {
    fillBookForm(props.book || {});
}

function submitBook(event) {
    if (props.submitting || checkingCover.value || (!props.book && addMode.value === 'search')) { return; }
    const form = event.target;
    const descriptionField = form.querySelector('#edit-description');
    descriptionField.setCustomValidity(descriptionWordCount.value > maxDescriptionWords ? `Use ${maxDescriptionWords} words or fewer.` : '');
    //@lee-hlmilk > noValidate allows submit event > still use native required &&& pattern &&& number validity
    if (!validate(form)) {
        if (invalidFields.value.includes('edit-year')) {
            metadataOpen.value = true;
        }
        toast.error(descriptionWordCount.value > maxDescriptionWords ? `Description must be ${maxDescriptionWords} words or fewer.` : 'Please check the highlighted fields. Title, collection area and subject are required.');
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
    emit('submit', data, coverFile.value);
}

//@lee-hlmilk > reopening starts a fresh draft from saved book ||| blank fields > failed saves keep current draft
watch(open, isOpen => {
    if (isOpen) {
        addMode.value = 'search';
        Object.assign(importDraft, { selectedIds: [], addedIds: [], reviewBooks: [], reviewing: false, invalidIds: [] });
        resetForm();
    } else { resetCoverFile(); }
}, { immediate: true });

defineExpose({ selectAddMode });
</script>
<template>
    <!--@lee-hlmilk > edit book dialog form-->
    <AdminFormDialog v-model:open="open" :title="props.book ? 'Edit book' : 'Add book'"
        :description="props.book ? 'update the book details and cover photo' : 'find books on Open Library or enter the details manually'"
        submitLabel="Add book" :submittingLabel="submittingLabel" footerClass="grid grid-cols-2"
        :hideForm="!props.book && addMode === 'search'"
        :showFooterSeparator="!props.book"
        :submitting="props.submitting || checkingCover" :dirty="isFormDirty" noValidate @submit="submitBook">
        <template #headerAside>
            <StatusBadge v-if="props.book" :status="props.book.status" dot :title="props.book.status" class="shrink-0 leading-none" />
        </template>
        <template v-if="!props.book" #top>
            <AdminTabs :modelValue="addMode" :tabs="[{ value: 'search', label: 'Open Library' }, { value: 'manual', label: 'Manual entry' }]"
                label="How to add books" :disabled="props.submitting || checkingCover" @update:modelValue="selectAddMode" />
            <!--@lee-hlmilk > relay query updates &&& lookup actions > import submission becomes the view's import event-->
            <BookImportSelection v-show="addMode === 'search'" v-model:query="query" :lookup="props.lookup" :draft="importDraft"
                :stations="props.stations" :submitting="props.submitting" :importedIds="props.importedIds"
                @search="emit('search')" @select="emit('select')" @submit="emit('import', $event)" />
        </template>
        <template #footer="{ close }">
            <Button type="button" variant="outline" class="w-full" :disabled="props.submitting || checkingCover" @click="close"><AppIcon name="cancel" />Cancel</Button>
            <Button type="submit" class="w-full" :disabled="props.submitting || checkingCover" :loading="props.submitting || checkingCover"
                :title="props.book ? 'Save changes' : 'Add book'"><AppIcon name="save" /><span class="sr-only">{{ props.submitting || checkingCover ? submittingLabel : props.book ? 'Save changes' : 'Add book' }}</span></Button>
        </template>
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
                    class="hidden" aria-describedby="cover-file-help" @change="selectCover" />
                <div class="w-fit pb-2 pr-2">
                    <button type="button" class="relative flex h-36 w-24 items-center justify-center rounded-lg border bg-primary/20 hover:bg-primary/40"
                        :disabled="props.submitting || checkingCover"
                        :aria-describedby="coverError ? 'cover-file-help cover-photo-error' : 'cover-file-help'"
                        :aria-invalid="Boolean(coverError)" :title="coverPreview || bookForm.coverurl ? 'Replace photo' : 'Upload photo'"
                        @click="coverInput?.click()">
                        <img v-if="coverPreview || bookForm.coverurl" :src="coverPreview || bookForm.coverurl" alt="Preview of the book’s front cover"
                            class="h-full w-full rounded-lg object-contain" />
                        <AppIcon v-else name="upload" :size="24" />
                        <span v-if="coverPreview || bookForm.coverurl" class="absolute -bottom-2 -right-2 grid size-11 place-items-center rounded-lg bg-background"><AppIcon name="upload" /></span>
                        <span class="sr-only">{{ coverPreview || bookForm.coverurl ? 'Replace photo' : 'Upload photo' }}</span>
                    </button>
                </div>
                <p id="cover-file-help" class="text-sm text-muted-foreground">JPG, PNG or WebP · Maximum 5 MB</p>
                <p v-if="coverFile" :title="coverFile.name" class="truncate text-sm text-muted-foreground">{{ coverFile.name }}</p>
                <p v-if="checkingCover" role="status" class="text-sm text-muted-foreground">Checking photo…</p>
                <p v-else-if="props.uploadingCover" role="status" class="text-sm text-muted-foreground">Uploading photo…</p>
                <p v-else-if="coverFile" class="text-sm text-muted-foreground">Photo will be saved when you save the book.</p>
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
                <AppStationSelect id="edit-station" v-model="bookForm.mrtstationid" :stations="stationOptions" required :disabled="submitting" :aria-invalid="invalidFields.includes('edit-station')" />
            </Field>
            <Field class="sm:col-span-2">
                <FieldLabel for="edit-description">Description</FieldLabel>
                <AppTextarea id="edit-description" v-model="bookForm.description" rows="3" aria-describedby="edit-description-count"
                    :aria-invalid="invalidFields.includes('edit-description')" @input="validateDescription"
                    class="w-full min-w-0 rounded-lg border p-2.5 text-base" />
                <p id="edit-description-count" class="text-right text-sm" :class="descriptionWordCount > maxDescriptionWords ? 'text-destructive' : 'text-muted-foreground'">{{ descriptionWordCount }} / {{ maxDescriptionWords }} words max</p>
            </Field>
        </div>

        <!--@lee-hlmilk > collapsible secondary book metadata fields-->
        <details :open="metadataOpen" @toggle="metadataOpen = $event.target.open">
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
