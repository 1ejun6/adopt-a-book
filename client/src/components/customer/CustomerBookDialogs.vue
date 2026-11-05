<script setup>
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '@/lib/api';
import { storeToRefs } from 'pinia';
import { useAdoptionsStore } from '@/stores/adoptions';
const adoptions = useAdoptionsStore();
const { applicationsForBook, applicationsLoading, applicationsError } = storeToRefs(adoptions);
import { hasExistingAdoption, getApplicationStatus, recordId } from '@/lib/adoptions';
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore();
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
const requestError = ref('');
const requestUncertain = ref(false);
const receiptWarning = ref('');
const submittedApplication = ref(null);
const actionLoading = ref(false);
let loadid = 0;
let controller;
let dialogTrigger;
const returnToAdoption = ref(null);

const getapplications = () => adoptions.fetchApplications({ force: true });
const matchingApplications = computed(() =>
  applicationsForBook.value(dialogBook.value?.id).filter(hasExistingAdoption),
);
const hasExistingRequest = computed(() => matchingApplications.value.length > 0);
const existingApplication = computed(() => {
  if (matchingApplications.value.length === 1) {
    return matchingApplications.value[0];
  }
  return null;
});
const applicationId = computed(() =>
  recordId(submittedApplication.value || existingApplication.value),
);
const requestLink = computed(() => {
  const query = {};
  if (applicationId.value) {
    query.request = applicationId.value;
  }
  return { name: 'customerAdoptions', query };
});
const canRequestBook = computed(
  () =>
    !viewOnly.value &&
    !detailsLoading.value &&
    !detailsError.value &&
    !applicationsLoading.value &&
    !applicationsError.value &&
    !actionLoading.value &&
    !requestSubmitted.value &&
    !requestUncertain.value &&
    !hasExistingRequest.value &&
    !adoptions.pendingWrites.has(`book:${dialogBook.value?.id}`) &&
    dialogBook.value?.status === 'available',
);
const requestButtonLabel = computed(() => {
  if (applicationsLoading.value) {
    return 'Checking requests…';
  }
  if (applicationsError.value) {
    return 'Request status unavailable';
  }
  return dialogBook.value?.status === 'available' ? 'Request this book' : 'Book unavailable';
});
function showerror(error, retry) {
  toast.error(error.message || 'Could not load book information.', {
    id: 'book-dialog-error',
    duration: Infinity,
    closeButton: true,
    style: { pointerEvents: 'auto' },
    action: { label: 'Retry', onClick: retry },
  });
}
function cancelload() {
  loadid++;
  controller?.abort();
}

//@1ejun6 > independent reads run together > cancelled & older responses cannot replace selected book
async function openBookDetails(book, options = {}) {
  if (!book?.id) {
    return;
  }
  cancelload();
  const id = loadid;
  const request = new AbortController();
  controller = request;
  const current = () => id === loadid && dialogOpen.value && !request.signal.aborted;
  const retry = () => openBookDetails(book, options);
  dialogTrigger = document.activeElement;
  toast.dismiss('book-dialog-error');
  viewOnly.value = options.viewOnly === true;
  returnToAdoption.value = options.onReturn || null;
  dialogBook.value = book;
  dialogOpen.value = true;
  requestDialogOpen.value = false;
  detailsLoading.value = true;
  detailsError.value = '';
  requestSubmitted.value = false;
  requestError.value = '';
  requestUncertain.value = false;
  receiptWarning.value = '';
  submittedApplication.value = null;
  actionLoading.value = false;

  const details = api(`/books/${book.id}`, { method: 'GET', signal: request.signal })
    .then(response => {
      if (!current()) {
        return;
      }
      if (!response.book?.id) {
        throw new Error('Could not load book details.');
      }
      dialogBook.value = response.book;
    })
    .catch(error => {
      if (current()) {
        detailsError.value = error.message;
        showerror(error, retry);
      }
    })
    .finally(() => {
      if (current()) {
        detailsLoading.value = false;
      }
    });
  const requests = viewOnly.value
    ? Promise.resolve()
    : getapplications().catch(() => { });
  await Promise.all([details, requests]);
}
async function openRequestDialog() {
  if (!canRequestBook.value) {
    return;
  }
  const book = dialogBook.value;
  dialogOpen.value = false;
  await nextTick();
  if (dialogBook.value === book && !dialogOpen.value) {
    requestDialogOpen.value = true;
  }
}
async function backToBook() {
  const book = dialogBook.value;
  const trigger = dialogTrigger;
  requestDialogOpen.value = false;
  await nextTick();
  await openBookDetails(book);
  dialogTrigger = trigger;
}
function restoreRequestFocus(event) {
  event.preventDefault();
  if (!dialogOpen.value && dialogTrigger?.isConnected) {
    dialogTrigger.focus({ preventScroll: true });
  }
}

async function checkRequestStatus() {
  if (actionLoading.value) return;
  const id = loadid;
  const book = dialogBook.value;
  actionLoading.value = true;
  try {
    const freshBook = await adoptions.reconcileApplication(book.id);
    if (id !== loadid) return;
    dialogBook.value = freshBook;
    if (hasExistingRequest.value) {
      submittedApplication.value = existingApplication.value;
      requestSubmitted.value = true;
      requestUncertain.value = false;
      requestError.value = '';
    } else {
      const response = await api(`/books/${book.id}`, { method: 'GET' });
      if (id !== loadid) return;
      if (!response.book?.id) throw new Error('book unavailable');
      dialogBook.value = response.book;
      requestUncertain.value = response.book.status !== 'available';
      requestError.value = requestUncertain.value
        ? 'This book is no longer available for requests.'
        : 'Your request was not saved. You can try again.';
    }
  } catch {
    if (id === loadid) requestError.value = 'We couldn’t confirm whether your request was saved. Check its status before trying again.';
  } finally {
    if (id === loadid) actionLoading.value = false;
  }
}
//@1ejun6 > capture selected copy before awaiting > recheck requests before submitting once
async function requestCopy() {
  if (!dialogBook.value || actionLoading.value || requestUncertain.value || requestSubmitted.value || viewOnly.value) {
    return;
  }
  const book = dialogBook.value;
  const id = loadid;
  const request = new AbortController();
  controller = request;
  actionLoading.value = true;
  requestError.value = '';
  try {
    await getapplications();
    if (id !== loadid) {
      return;
    }
    if (hasExistingRequest.value) {
      requestError.value =
        'You already have a request for this book. View your request in My Adoptions.';
      return;
    }
    if (book.status !== 'available') {
      requestError.value = 'This book is no longer available for requests.';
      return;
    }
    const { refreshed } = await adoptions.submitApplication(book.id);
    if (id !== loadid) return;
    requestSubmitted.value = true;
    submittedApplication.value = existingApplication.value;
    if (!refreshed || !applicationId.value) {
      receiptWarning.value = 'Your request was sent, but we couldn’t refresh its details. View My Adoptions to check.';
    }
  } catch {
    if (id === loadid) {
      requestUncertain.value = true;
      actionLoading.value = false;
      await checkRequestStatus();
    }
  } finally {
    if (id === loadid) {
      actionLoading.value = false;
    }
  }
}
watch(
  dialogOpen,
  value => {
    if (!value && !requestDialogOpen.value) {
      cancelload();
    }
  },
  { flush: 'sync' },
);
watch(dialogOpen, async value => {
  if (!value && returnToAdoption.value) {
    const back = returnToAdoption.value;
    returnToAdoption.value = null;
    await nextTick();
    await back();
  }
});
watch(
  requestDialogOpen,
  value => {
    if (!value && !dialogOpen.value) {
      cancelload();
    }
  },
  { flush: 'sync' },
);
watch(() => auth.user?.id, () => {
  cancelload();
  dialogOpen.value = false;
  requestDialogOpen.value = false;
  dialogBook.value = null;
});
onBeforeUnmount(cancelload);
function closeBookDetails(book) {
  if (!book || dialogBook.value?.id === book.id) {
    dialogOpen.value = false;
  }
}
defineExpose({ openBookDetails, closeBookDetails });
</script>

<template>
  <AppBookPreviewDialog @retry="openBookDetails(dialogBook, { viewOnly, onReturn: returnToAdoption })" v-model:open="dialogOpen" :book="dialogBook" :loading="detailsLoading" :error="detailsError"
    :saved="props.savedIds.has(dialogBook?.id)" :canSave="props.canSave" :busy="props.busyIds.has(dialogBook?.id)"
    @save="emit('save', $event)">
    <template v-if="$slots['book-action']" #book-action>
      <slot name="book-action" :book="dialogBook" />
    </template>
    <template v-if="$slots.details" #details>
      <slot name="details" :book="dialogBook" />
    </template>
    <template v-if="viewOnly && returnToAdoption" #actions>
      <Button type="button" variant="outline" @click="dialogOpen = false">Back to adoption details</Button>
    </template>
    <template v-else-if="!viewOnly" #actions>
      <slot name="extra-actions" :book="dialogBook" />
      <div class="w-full space-y-3">
        <p v-if="hasExistingRequest" class="text-sm">You already have a request for this book.</p>
        <p v-else-if="applicationsError" class="text-sm text-destructive" role="alert">
          Could not check your existing requests. Retry before submitting.
        </p>
        <template v-else>
          <p class="text-sm">
            {{
              dialogBook?.status === 'available'
                ? 'Available to request'
                : 'Unavailable for new requests'
            }}
          </p>
          <p v-if="dialogBook?.status === 'available'" class="text-sm text-muted-foreground">
            Your request needs approval. If approved, you can arrange collection.
          </p>
        </template>
        <Button v-if="hasExistingRequest" asChild class="w-full">
          <RouterLink :to="requestLink">View my request</RouterLink>
        </Button>
        <Button v-else class="w-full" :disabled="!canRequestBook" @click="openRequestDialog">
          {{ requestButtonLabel }}
        </Button>
        <button v-if="applicationsError" type="button" class="min-h-11 text-sm underline underline-offset-4"
          @click="openBookDetails(dialogBook)">
          Retry request check
        </button>
      </div>
    </template>
  </AppBookPreviewDialog>
  <RequestCopyDialog v-model:open="requestDialogOpen" :book="dialogBook" :reader="auth.user" :loading="actionLoading"
    :submitted="requestSubmitted" :existing="hasExistingRequest" :disabled="!!applicationsError || requestUncertain"
    :uncertain="requestUncertain" :applicationStatus="getApplicationStatus(submittedApplication || existingApplication)"
    :error="requestError" :receiptWarning="receiptWarning" :applicationId="applicationId" @submit="requestCopy"
    @check="checkRequestStatus" @back="backToBook" @restore-focus="restoreRequestFocus" />
</template>
