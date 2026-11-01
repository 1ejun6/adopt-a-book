<script setup>
import { ref, computed, h, nextTick, watch, onBeforeUnmount } from 'vue';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { toast } from 'vue-sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Bookmark02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FocusScope } from 'reka-ui';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import RequestCopyDialog from '@/components/customer/RequestCopyDialog.vue';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const props = defineProps({
  savedIds: { type: Set, default: () => new Set() },
  canSave: { type: Boolean, default: false },
  busyIds: { type: Set, default: () => new Set() },
});
const emit = defineEmits(['save']);
const dialogBook = ref(null);
const dialogOpen = ref(false);
const detailsLoading = ref(false);
const detailsError = ref('');
const viewOnly = ref(false);
const requestDialogOpen = ref(false);
const requestSubmitted = ref(false);
const actionLoading = ref(false);
const applications = ref([]);
const applicationsLoading = ref(false);
const applicationsError = ref('');
const activeStatuses = ['pending', 'pending review', 'approved', 'pickup requested', 'pickup confirmed', 'collected', 'completed'];
let loadid = 0;
let controller;
const commentToasts = new Set();

//@1ejun6 > save book first > optional comment stays in toast until saved or dismissed
function showSavedToast(entry) {
  const id = `watchlist-comment-${entry.bookid.id}`;
  const comment = ref('');
  const busy = ref(false);
  const options = { id, duration: Infinity, closeButton: true, style: { pointerEvents: 'auto' } };
  const description = () => h(FocusScope, { asChild: true, trapped: true, loop: true }, () => h('form', { class: 'space-y-2.5', onSubmit: saveComment }, [
    h('label', { class: 'block' }, [
      `optional comment for ${entry.bookid.title}`,
      h(Input, { modelValue: comment.value, 'onUpdate:modelValue': value => { comment.value = value; }, maxlength: 300, disabled: busy.value, placeholder: 'add a comment' }),
    ]),
    h('div', { class: 'flex gap-2.5' }, [
      h(Button, { type: 'submit', size: 'sm', disabled: busy.value || !comment.value.trim() }, () => busy.value ? 'saving…' : 'save comment'),
      h(Button, { type: 'button', size: 'sm', variant: 'outline', onClick: () => toast.dismiss(id) }, () => 'skip'),
    ]),
  ]));
  async function saveComment(event) {
    event.preventDefault();
    if (busy.value || !comment.value.trim()) return;
    busy.value = true;
    try {
      await api(`/watchlist/${entry.id}`, { method: 'PATCH', body: { comments: comment.value.trim() } });
      toast.success('comment saved', { ...options, description: undefined, duration: 1000 });
    } catch (error) {
      toast.error(error.message, { ...options, description });
    } finally {
      busy.value = false;
    }
  }
  commentToasts.add(id);
  toast.success('saved to watchlist', { ...options, description });
}

function getAuthors(book) {
  return Array.isArray(book?.authors) && book.authors.length
    ? book.authors.join(', ')
    : 'Unknown author';
}

//@sree-sanjana06 > remove Open Library references from descriptions
function cleanDescription(description) {
  if (typeof description !== 'string') return '';

  return description
    .split(/\(?\[source\](?:\[\d+\])?\)?/i)[0]
    .split(/\n\s*(?:Preceded by:|Followed by:|Contains:|-{4,}|\[\d+\]:\s*https?:\/\/)/i)[0]
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const description = computed(() => cleanDescription(dialogBook.value?.description));
const fields = computed(() => [
  { label: 'subject', value: dialogBook.value?.subjects?.join(', ') },
  { label: 'published', value: dialogBook.value?.publicationyear },
  { label: 'ISBN', value: dialogBook.value?.isbn },
  { label: 'condition', value: dialogBook.value?.condition || 'not listed' },
  { label: 'collection', value: dialogBook.value?.collectionarea },
].filter(field => field.value));

//@sree-sanjana06 > standardise application status values
function getApplicationStatus(application) {
  return String(application.status || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

async function getapplications(signal) {
  const response = await api('/applications', { method: 'GET', signal });
  if (!Array.isArray(response.adoptionapplications)) throw new Error('could not check adoption requests > try again');
  return response.adoptionapplications;
}

const existingApplication = computed(() => applications.value.find(application => {
  const id = typeof application.bookid === 'object' ? application.bookid?.id : application.bookid;
  return id === dialogBook.value?.id && activeStatuses.includes(getApplicationStatus(application));
}));

const canRequestBook = computed(() => !viewOnly.value && !detailsLoading.value && !detailsError.value && !applicationsLoading.value && !applicationsError.value && !actionLoading.value && !requestSubmitted.value && !existingApplication.value && dialogBook.value?.status === 'available');

const requestButtonLabel = computed(() => {
  if (requestSubmitted.value) return 'Request Submitted';
  if (applicationsLoading.value) return 'Checking Requests';
  if (applicationsError.value) return 'Request Unavailable';
  if (existingApplication.value) {
    const status = getApplicationStatus(existingApplication.value);
    if (['pending', 'pending review'].includes(status)) return 'Request Pending';
    return status === 'approved' ? 'Already Approved' : 'Already Requested';
  }
  return dialogBook.value?.status === 'available' ? 'Request Book' : 'Book Unavailable';
});

function showerror(error, retry) {
  toast.error(error.message || 'could not load book information', { id: 'book-dialog-error', duration: Infinity, closeButton: true, style: { pointerEvents: 'auto' }, action: { label: 'retry', onClick: retry } });
}

function cancelload() {
  loadid++;
  controller?.abort();
}

//@1ejun6 > independent reads run together > cancelled & older responses cannot replace selected book
async function openBookDetails(book, options = {}) {
  if (!book?.id) return;
  cancelload();
  const id = loadid;
  const request = new AbortController();
  controller = request;
  const current = () => id === loadid && dialogOpen.value && !request.signal.aborted;
  const retry = () => openBookDetails(book, options);
  toast.dismiss('book-dialog-error');
  viewOnly.value = options.viewOnly === true;
  dialogBook.value = book;
  dialogOpen.value = true;
  requestDialogOpen.value = false;
  detailsLoading.value = true;
  detailsError.value = '';
  requestSubmitted.value = false;
  applications.value = [];
  applicationsError.value = '';
  applicationsLoading.value = !viewOnly.value;

  const details = api(`/books/${book.id}`, { method: 'GET', signal: request.signal }).then(response => {
    if (!current()) return;
    if (!response.book?.id) throw new Error('could not load book details');
    dialogBook.value = response.book;
  }).catch(error => {
    if (!current()) return;
    detailsError.value = error.message;
    showerror(error, retry);
  }).finally(() => { if (current()) detailsLoading.value = false; });

  const requests = viewOnly.value ? Promise.resolve() : getapplications(request.signal).then(records => {
    if (current()) applications.value = records;
  }).catch(error => {
    if (!current()) return;
    applicationsError.value = error.message;
    showerror(error, retry);
  }).finally(() => { if (current()) applicationsLoading.value = false; });

  await Promise.all([details, requests]);
  if (!current() || detailsError.value || applicationsError.value || viewOnly.value) return;
  if (existingApplication.value) toast.info('you already requested this copy > check my adoptions', { style: { pointerEvents: 'auto' } });
  else if (dialogBook.value?.status !== 'available') toast.info('this book is unavailable for requests', { style: { pointerEvents: 'auto' } });
}

async function openRequestDialog() {
  if (!canRequestBook.value) return;
  const book = dialogBook.value;
  dialogOpen.value = false;
  await nextTick();
  if (dialogBook.value === book && !dialogOpen.value) requestDialogOpen.value = true;
}

//@1ejun6 > capture selected copy before awaiting > recheck requests before submitting once
async function requestCopy() {
  if (!dialogBook.value || actionLoading.value || requestSubmitted.value || viewOnly.value) return;
  const book = dialogBook.value;
  const id = loadid;
  actionLoading.value = true;
  applicationsError.value = '';
  try {
    const records = await getapplications();
    if (id !== loadid) return;
    applications.value = records;
    if (existingApplication.value) {
      toast.info('you already requested this copy > check my adoptions', { style: { pointerEvents: 'auto' } });
      return;
    }
    if (book.status !== 'available') {
      toast.info('this book is no longer available for requests', { style: { pointerEvents: 'auto' } });
      return;
    }
    await api('/applications', { method: 'POST', body: { bookid: book.id } });
    if (id === loadid) {
      requestSubmitted.value = true;
      applications.value.push({ bookid: book.id, status: 'pending' });
    }
    toast.success('adoption request submitted', { style: { pointerEvents: 'auto' } });
  } catch (error) {
    if (id === loadid) showerror(error, () => openBookDetails(book));
  } finally {
    actionLoading.value = false;
  }
}

watch(dialogOpen, value => { if (!value) cancelload(); }, { flush: 'sync' });
watch(requestDialogOpen, value => { if (!value && !dialogOpen.value) cancelload(); }, { flush: 'sync' });
onBeforeUnmount(() => {
  cancelload();
  commentToasts.forEach(id => toast.dismiss(id));
});
defineExpose({ openBookDetails, showSavedToast });
</script>

<template>
  <!--@sree-sanjana06 > shared preview for Home, Browse Books, Watchlist and My Adoptions-->
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="max-w-3xl p-0">
      <DialogHeader class="border-b p-5 pr-20">
        <DialogTitle class="text-3xl">Book details</DialogTitle>
        <DialogDescription class="sr-only">{{ dialogBook?.title }}</DialogDescription>
      </DialogHeader>

      <div v-if="dialogBook" class="space-y-5 p-5">
        <div v-if="detailsLoading" class="space-y-5" role="status" aria-busy="true">
          <AppBookIdentity loading coverClass="w-16" />
          <Skeleton class="h-5 w-24" />
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-2/3" />
          <div class="grid grid-cols-2 gap-5">
            <div v-for="index in 5" :key="index" class="space-y-2.5">
              <Skeleton class="h-4 w-1/2" />
              <Skeleton class="h-4" />
            </div>
          </div>
        </div>

        <div v-else-if="!detailsError" class="space-y-5">
          <div class="flex items-center gap-2.5">
            <AppBookIdentity :title="dialogBook.title" :author="getAuthors(dialogBook)" :cover="dialogBook.coverurl" coverClass="w-16" class="flex-1" />
            <button v-if="props.canSave || props.savedIds.has(dialogBook.id)" type="button" class="shrink-0 rounded-lg p-2" :disabled="!props.canSave || props.busyIds.has(dialogBook.id)" :title="props.savedIds.has(dialogBook.id) ? 'remove from watchlist' : 'save to watchlist'" :aria-pressed="props.savedIds.has(dialogBook.id)" @click="emit('save', dialogBook)">
              <HugeiconsIcon :icon="Bookmark02Icon" class="size-6" :class="{ 'fill-success-foreground text-success-foreground': props.savedIds.has(dialogBook.id) }" aria-hidden="true" />
            </button>
          </div>

          <!--@sree-sanjana06 > book description-->
          <div class="space-y-2">
            <h3>Description</h3>
            <p v-if="description" class="text-muted-foreground leading-6">{{ description }}</p>
            <p v-else class="text-muted-foreground italic">No description available.</p>
          </div>

          <dl class="grid grid-cols-2 gap-5">
            <div v-for="field in fields" :key="field.label" class="space-y-2.5">
              <dt class="text-muted-foreground">{{ field.label }}</dt>
              <dd>{{ field.value }}</dd>
            </div>
          </dl>
        </div>

        <!-- ==================== REQUEST ACTION ==================== -->
        <!--@sree-sanjana06 > hide the entire request section for My Adoptions-->
        <div v-if="!viewOnly && !detailsLoading && !detailsError" class="space-y-4 border-t pt-5">
          <h3>A book, not a checkout.</h3>
          <p class="text-muted-foreground">Request this donated copy for free. The team reviews your request before you
            arrange collection.</p>


          <Button class="w-full" :disabled="!canRequestBook" @click="openRequestDialog">{{ requestButtonLabel
            }}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <RequestCopyDialog v-model:open="requestDialogOpen" :book="dialogBook" :reader="auth.user" :loading="actionLoading"
    :submitted="requestSubmitted" :disabled="!!existingApplication || !!applicationsError" @submit="requestCopy" />
</template>
