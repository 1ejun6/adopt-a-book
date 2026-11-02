<script setup>
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue';
import { api } from '@/lib/api';
import { getApplicationStatus } from '@/lib/adoptions';
import { auth } from '@/lib/auth';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import AppBookPreviewDialog from '@/components/shared/AppBookPreviewDialog.vue';
import RequestCopyDialog from '@/components/customer/RequestCopyDialog.vue';

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

async function getapplications(signal) {
  const response = await api('/applications', { method: 'GET', signal });
  if (!Array.isArray(response.adoptionapplications)) throw new Error('could not check adoption requests > try again');
  return response.adoptionapplications;
}

const existingApplication = computed(() => applications.value.find(application => {
  const id = typeof application.bookid === 'object' ? application.bookid?.id : application.bookid;
  return id === dialogBook.value?.id && activeStatuses.includes(getApplicationStatus(application, ''));
}));

const canRequestBook = computed(() => !viewOnly.value && !detailsLoading.value && !detailsError.value && !applicationsLoading.value && !applicationsError.value && !actionLoading.value && !requestSubmitted.value && !existingApplication.value && dialogBook.value?.status === 'available');

const requestButtonLabel = computed(() => {
  if (requestSubmitted.value) return 'Request Submitted';
  if (applicationsLoading.value) return 'Checking Requests';
  if (applicationsError.value) return 'Request Unavailable';
  if (existingApplication.value) {
    const status = getApplicationStatus(existingApplication.value, '');
    if (['pending', 'pending review'].includes(status)) return 'Request Pending';
    return status === 'approved' ? 'Already Approved' : 'Already Requested';
  }
  return dialogBook.value?.status === 'available' ? 'request' : 'Book Unavailable';
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
onBeforeUnmount(cancelload);
function closeBookDetails(book) {
  if (!book || dialogBook.value?.id === book.id) dialogOpen.value = false;
}
defineExpose({ openBookDetails, closeBookDetails });
</script>

<template>
  <AppBookPreviewDialog v-model:open="dialogOpen" :book="dialogBook" :loading="detailsLoading" :error="detailsError"
    :saved="props.savedIds.has(dialogBook?.id)" :canSave="props.canSave" :busy="props.busyIds.has(dialogBook?.id)"
    @save="emit('save', $event)">
    <template v-if="$slots['book-action']" #book-action>
      <slot name="book-action" :book="dialogBook" />
    </template>
    <template v-if="$slots.details" #details>
      <slot name="details" :book="dialogBook" />
    </template>
    <template v-if="!viewOnly" #actions>
      <slot name="extra-actions" :book="dialogBook" />
      <Button class="w-full" :disabled="!canRequestBook" @click="openRequestDialog">{{ requestButtonLabel }}</Button>
    </template>
  </AppBookPreviewDialog>

  <RequestCopyDialog v-model:open="requestDialogOpen" :book="dialogBook" :reader="auth.user" :loading="actionLoading"
    :submitted="requestSubmitted" :disabled="!!existingApplication || !!applicationsError" @submit="requestCopy" />
</template>
