<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue';
import { RouterLink, useRoute, useRouter, onBeforeRouteLeave } from 'vue-router';
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
import CustomerAdoptionDialog from '@/components/customer/CustomerAdoptionDialog.vue';

const props = defineProps({
  savedIds: { type: Set, default: () => new Set() },
  canSave: { type: Boolean, default: false },
  busyIds: { type: Set, default: () => new Set() },
  savingIds: { type: Set, default: () => new Set() },
});
const emit = defineEmits(['save']);
const route = useRoute();
const router = useRouter();
const targetError = ref('');
let targetBook = '';
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
const requestDetailsOpen = ref(false);
const requestDetailsDialog = ref(null);
const selectedRequestId = ref('');
const selectedPickupId = ref('');
const selectedRequest = computed(() => adoptions.journeys.find(record => record.id === selectedRequestId.value) || null);
const selectedPickup = computed(() => adoptions.appointments.find(item => recordId(item) === selectedPickupId.value) || null);
async function openExistingRequest() {
  const application = existingApplication.value || matchingApplications.value[0];
  if (!application) return;
  selectedRequestId.value = recordId(application);
  selectedPickupId.value = recordId(selectedRequest.value?.appointment);
  requestDetailsOpen.value = true;
  dialogOpen.value = false;
  if (!await adoptions.refresh()) toast.error('Could not refresh your request. Please try again.');
}
async function reconcilePickup() {
  const ready = await adoptions.refresh();
  return { ready, record: selectedRequest.value, appointments: adoptions.appointments };
}
async function pickupChanged(appointment, reload = true) {
  if (recordId(appointment)) selectedPickupId.value = recordId(appointment);
  return reload ? adoptions.refresh() : adoptions.ready;
}
async function requestWithdrawn(_id, reload = true) {
  return reload ? adoptions.refresh() : adoptions.ready;
}
async function backFromRequest() {
  requestDetailsOpen.value = false;
  await nextTick();
  await backToBook();
}
onBeforeRouteLeave(() => requestDetailsDialog.value?.canNavigate() ?? true);
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
    return 'checking requests…';
  }
  if (applicationsError.value) {
    return 'request status unavailable';
  }
  return dialogBook.value?.status === 'available' ? 'request' : 'book unavailable';
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
        detailsError.value = error.status === 404 ? 'This copy is no longer listed. Close this dialog to browse other books.' : error.message;
        showerror({ message: detailsError.value }, retry);
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
  if (requestDialogOpen.value || requestDetailsOpen.value || dialogOpen.value) return;
  event.preventDefault();
  if (dialogTrigger?.isConnected && dialogTrigger !== document.body) {
    dialogTrigger.focus({ preventScroll: true });
  } else {
    const heading = document.querySelector('main h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
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
  if (!value && targetBook && !requestDialogOpen.value) {
    const query = { ...route.query };
    delete query.book;
    targetBook = '';
    await router.replace({ query });
  }
  if (!value && returnToAdoption.value) {
    const back = returnToAdoption.value;
    returnToAdoption.value = null;
    await nextTick();
    await back();
  }
});
//@lee-hlmilk > validate shared copy links before fetching > preserve the catalogue filters when the dialog closes
watch(() => route.query.book, value => {
  if (route.name !== 'customerBooks') return;
  if (!value) {
    targetError.value = '';
    if (targetBook) {
      targetBook = '';
      dialogOpen.value = false;
    }
    return;
  }
  if (value === targetBook) return;
  targetError.value = '';
  if (typeof value !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[1-8][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value)) {
    targetBook = '';
    dialogOpen.value = false;
    targetError.value = 'This book link is invalid. Browse the available books instead.';
    return;
  }
  targetBook = value;
  openBookDetails({ id: value });
}, { immediate: true });
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
  requestDetailsOpen.value = false;
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
  <p v-if="targetError" role="alert">{{ targetError }} <Button asChild variant="outline"><RouterLink class="min-h-11 inline-flex items-center" :to="{ query: { ...route.query, book: undefined } }"><AppIcon name="book" />Browse available books</RouterLink></Button></p>
  <AppBookPreviewDialog @close-auto-focus="restoreRequestFocus" @retry="openBookDetails(dialogBook, { viewOnly, onReturn: returnToAdoption })" v-model:open="dialogOpen" :book="dialogBook" :loading="detailsLoading" :error="detailsError"
    :saved="props.savedIds.has(dialogBook?.id)" :canSave="props.canSave" :busy="props.busyIds.has(dialogBook?.id)" :saving="props.savingIds.has(dialogBook?.id)"
    @save="emit('save', $event)">
    <template v-if="$slots['book-action']" #book-action>
      <slot name="book-action" :book="dialogBook" />
    </template>
    <template v-if="$slots.details" #details>
      <slot name="details" :book="dialogBook" />
    </template>
    <template v-if="viewOnly && returnToAdoption" #actions>
      <Button type="button" variant="outline" @click="dialogOpen = false"><AppIcon name="back" />Back to adoption details</Button>
    </template>
    <template v-else-if="!viewOnly" #actions>
      <div class="w-full space-y-3">
        <p v-if="applicationsError" class="text-sm text-destructive" role="alert">
          Could not check your existing requests. Retry before submitting.
        </p>
        <p v-else-if="!hasExistingRequest && dialogBook?.status !== 'available'" class="text-sm">Unavailable for new requests</p>
        <div class="grid items-center gap-2.5" :class="$slots['secondary-action'] ? 'grid-cols-2' : 'grid-cols-1'">
          <slot name="secondary-action" :book="dialogBook" />
          <Button v-if="hasExistingRequest" type="button" variant="outline" class="min-w-0 w-full hover:bg-primary" aria-label="view request" @click="openExistingRequest">
            <AppIcon name="view" />
          </Button>
          <Button v-else class="min-w-0 w-full" :disabled="!canRequestBook" @click="openRequestDialog">
            {{ requestButtonLabel }}
          </Button>
        </div>
        <Button variant="outline" v-if="applicationsError" type="button" class="min-h-11 text-sm"
          @click="openBookDetails(dialogBook)" :loading="detailsLoading || applicationsLoading"><AppIcon name="refresh" /><span class="sr-only">
          Retry request check
        </span></Button>
      </div>
    </template>
  </AppBookPreviewDialog>
  <CustomerAdoptionDialog embedded v-if="selectedRequest" ref="requestDetailsDialog" v-model:open="requestDetailsOpen"
    :record="selectedRequest" :appointment="selectedPickup" :ready="adoptions.ready"
    :requestsReady="adoptions.applicationsLoaded && !applicationsLoading && !applicationsError"
    :reconcile="reconcilePickup" :refresh="adoptions.refresh" :complete="pickupChanged" :withdrawn="requestWithdrawn"
    @appointment="selectedPickupId = recordId($event)" @history="backFromRequest" @back-book="backFromRequest" @restore-focus="restoreRequestFocus" />
  <RequestCopyDialog v-model:open="requestDialogOpen" :book="dialogBook" :reader="auth.user" :loading="actionLoading"
    :submitted="requestSubmitted" :existing="hasExistingRequest" :disabled="!!applicationsError || requestUncertain"
    :uncertain="requestUncertain" :applicationStatus="getApplicationStatus(submittedApplication || existingApplication)"
    :error="requestError" :receiptWarning="receiptWarning" :applicationId="applicationId" @submit="requestCopy"
    @check="checkRequestStatus" @back="backToBook" @restore-focus="restoreRequestFocus" />
</template>
