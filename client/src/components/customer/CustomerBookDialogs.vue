<script setup>
import { ref, computed, nextTick } from 'vue';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import './CustomerBookDialogs.css';

//@sree-sanjana06 > preserve existing props and events for other customer pages
defineProps({
  watchlist: { type: Array, required: true },
  manageWatchlist: { type: Boolean, default: false }
});

defineEmits(['saved', 'edit']);

const dialogBook = ref(null);
const dialogOpen = ref(false);
const detailsLoading = ref(false);
const detailsError = ref('');

//@sree-sanjana06 > allow My Adoptions to open a read-only book preview
const viewOnly = ref(false);


const requestDialogOpen = ref(false);
const requestSubmitted = ref(false);
const actionLoading = ref(false);
const actionMessage = ref('');
const actionError = ref('');

//@sree-sanjana06 > track existing applications for the selected customer
const applications = ref([]);
const applicationsLoading = ref(false);
const applicationsError = ref('');

//@sree-sanjana06 > statuses that prevent another request for the same copy
const activeStatuses = [
  'pending',
  'pending review',
  'approved',
  'pickup requested',
  'pickup confirmed',
  'collected',
  'completed'
];

// ==================== SHARED HELPERS ====================

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

//@sree-sanjana06 > standardise application status values
function getApplicationStatus(application) {
  return String(application.status || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

// ==================== EXISTING APPLICATION CHECK ====================

//@sree-sanjana06 > use the confirmed backend response field adoptionapplications
async function loadApplications() {
  applicationsLoading.value = true;
  applicationsError.value = '';

  try {
    const response = await api('/applications', {
      method: 'GET'
    });

    if (!Array.isArray(response?.adoptionapplications)) {
      throw new Error('Unexpected adoption applications response.');
    }

    applications.value = response.adoptionapplications;
  } catch (error) {
    applications.value = [];
    applicationsError.value = 'Unable to verify your existing adoption requests.';
    throw error;
  } finally {
    applicationsLoading.value = false;
  }
}

//@sree-sanjana06 > compare exact book copy IDs, not titles
const existingApplication = computed(() => {
  if (!dialogBook.value?.id) return null;

  return applications.value.find(application => {
    const applicationBookId =
      typeof application.bookid === 'object'
        ? application.bookid?.id
        : application.bookid;

    return applicationBookId === dialogBook.value.id &&
      activeStatuses.includes(getApplicationStatus(application));
  }) || null;
});

//@sree-sanjana06 > only allow requests when no active application exists
const canRequestBook = computed(() =>
  !viewOnly.value &&
  !detailsLoading.value &&
  !detailsError.value &&
  !applicationsLoading.value &&
  !applicationsError.value &&
  !actionLoading.value &&
  !requestSubmitted.value &&
  !existingApplication.value &&
  dialogBook.value?.status === 'available'
);

//@sree-sanjana06 > explain why a customer cannot request this copy
const requestButtonLabel = computed(() => {
  if (requestSubmitted.value) return 'Request Submitted';
  if (applicationsLoading.value) return 'Checking Requests';
  if (applicationsError.value) return 'Request Unavailable';

  if (existingApplication.value) {
    const status = getApplicationStatus(existingApplication.value);

    if (['pending', 'pending review'].includes(status)) {
      return 'Request Pending';
    }

    if (status === 'approved') return 'Already Approved';

    return 'Already Requested';
  }

  if (dialogBook.value?.status !== 'available') {
    return 'Book Unavailable';
  }

  return 'Request Book';
});

//@sree-sanjana06 > shared preview supports normal and view-only modes
async function openBookDetails(book, options = {}) {
  if (!book?.id) return;

  viewOnly.value = options.viewOnly === true;
  dialogBook.value = book;
  dialogOpen.value = true;

  detailsLoading.value = true;
  detailsError.value = '';
  actionMessage.value = '';
  actionError.value = '';
  requestSubmitted.value = false;
  requestDialogOpen.value = false;

  applications.value = [];
  applicationsError.value = '';

  try {
    const result = await api(`/books/${book.id}`);
    dialogBook.value = result.book;
  } catch (error) {
    detailsError.value = error.message;
  } finally {
    detailsLoading.value = false;
  }

  //@sree-sanjana06 > no request check is needed in My Adoptions view-only mode
  if (!viewOnly.value) {
    try {
      await loadApplications();
    } catch (error) {
      console.error('Unable to check existing applications:', error);
    }
  }
}

defineExpose({ openBookDetails });

// ==================== REQUEST CONFIRMATION ====================

//@sree-sanjana06 > open confirmation only when the selected copy is eligible
async function openRequestDialog() {
  if (!canRequestBook.value) return;

  actionError.value = '';
  actionMessage.value = '';

  dialogOpen.value = false;
  await nextTick();

  requestDialogOpen.value = true;
}

// ==================== SUBMIT ADOPTION REQUEST ====================

//@sree-sanjana06 > recheck existing requests before sending POST /applications
async function requestCopy() {
  if (!dialogBook.value || actionLoading.value || requestSubmitted.value || viewOnly.value) return;

  actionLoading.value = true;
  actionError.value = '';
  actionMessage.value = '';

  try {
    await loadApplications();

    if (existingApplication.value) {
      actionError.value = 'You already have an active adoption request for this book.';
      return;
    }

    if (dialogBook.value.status !== 'available') {
      actionError.value = 'This book is no longer available for requests.';
      return;
    }

    await api('/applications', {
      method: 'POST',
      body: { bookid: dialogBook.value.id }
    });

    //@sree-sanjana06 > immediately prevent another submission in this session
    requestSubmitted.value = true;
    applications.value.push({
      bookid: dialogBook.value.id,
      status: 'pending'
    });

    actionMessage.value = 'Adoption request submitted successfully.';
  } catch (error) {
    actionError.value = error.message || 'Unable to submit your adoption request.';
  } finally {
    actionLoading.value = false;
  }
}
</script>

<template>
  <!-- ==================== BOOK DETAILS ==================== -->
  <!--@sree-sanjana06 > shared preview for Home, Browse Books, Watchlist and My Adoptions-->
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="w-[calc(100vw-2rem)] max-w-4xl p-0" :showCloseButton="false">
      <DialogHeader class="flex flex-row items-center justify-between border-b p-5">
        <DialogTitle class="font-heading text-3xl">Book details</DialogTitle>
        <Button variant="outline" @click="dialogOpen = false">Close</Button>
      </DialogHeader>

      <div v-if="dialogBook" class="space-y-6 p-6">
        <p v-if="detailsLoading" class="book-dialog__muted">Loading book details...</p>
        <p v-if="detailsError" class="book-dialog__error">{{ detailsError }}</p>

        <div class="space-y-5">
          <AppBookIdentity :title="dialogBook.title" :author="getAuthors(dialogBook)" :cover="dialogBook.coverurl" coverClass="w-32" />
          <AppStatusBadge v-if="dialogBook.status" :status="dialogBook.status" />

          <!--@sree-sanjana06 > book description-->
          <div class="space-y-2">
            <h3 class="font-heading text-xl">Description</h3>
            <p v-if="cleanDescription(dialogBook.description)" class="book-dialog__description">{{ cleanDescription(dialogBook.description) }}</p>
            <p v-else class="book-dialog__small-muted italic">No description available.</p>
          </div>

          <!--@sree-sanjana06 > show metadata only when available-->
          <dl class="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3">
            <template v-if="dialogBook.subjects?.length">
              <dt class="book-dialog__muted">Subjects</dt>
              <dd>{{ dialogBook.subjects.join(', ') }}</dd>
            </template>
            <template v-if="dialogBook.publicationyear">
              <dt class="book-dialog__muted">Published</dt>
              <dd>{{ dialogBook.publicationyear }}</dd>
            </template>
            <template v-if="dialogBook.isbn">
              <dt class="book-dialog__muted">ISBN</dt>
              <dd>{{ dialogBook.isbn }}</dd>
            </template>
            <template v-if="dialogBook.condition">
              <dt class="book-dialog__muted">Condition</dt>
              <dd class="capitalize">{{ dialogBook.condition }}</dd>
            </template>
            <template v-if="dialogBook.collectionarea">
              <dt class="book-dialog__muted">Collection</dt>
              <dd>{{ dialogBook.collectionarea }}</dd>
            </template>
          </dl>
        </div>

        <!-- ==================== REQUEST ACTION ==================== -->
        <!--@sree-sanjana06 > hide the entire request section for My Adoptions-->
        <div v-if="!viewOnly" class="space-y-4 border-t pt-5">
          <h3 class="font-heading text-xl">A book, not a checkout.</h3>
          <p class="book-dialog__muted">Request this donated copy for free. The team reviews your request before you arrange collection.</p>

          <p v-if="existingApplication" class="text-sm text-muted-foreground">You already have an active request for this copy. Track its progress in My Adoptions.</p>
          <p v-if="applicationsError" class="book-dialog__error">{{ applicationsError }}</p>

          <Button class="w-full" :disabled="!canRequestBook" @click="openRequestDialog">{{ requestButtonLabel }}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!-- ==================== REQUEST CONFIRMATION ==================== -->
  <!--@sree-sanjana06 > retain the existing confirmation popup for eligible requests-->
  <Dialog v-model:open="requestDialogOpen">
    <DialogContent class="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto p-0" :showCloseButton="false">
      <DialogHeader class="flex flex-row items-center justify-between border-b p-5">
        <DialogTitle class="font-heading text-3xl">Request a copy</DialogTitle>
        <Button variant="outline" @click="requestDialogOpen = false">Close</Button>
      </DialogHeader>

      <div v-if="dialogBook" class="space-y-6 p-6">

        <!--@sree-sanjana06 > request progress tracker-->
        <div class="grid grid-cols-4 gap-2 sm:gap-4">
          <div class="space-y-2 border-t-2 border-green-700 pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-green-100 text-green-800">✓</span>
            <p class="book-dialog__progress-text">Choose a book</p>
          </div>
          <div class="space-y-2 border-t-2 border-foreground pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-foreground text-background">2</span>
            <p class="book-dialog__progress-text font-semibold">Request &amp; review</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full bg-muted">3</span>
            <p class="book-dialog__progress-text">Arrange pickup</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full bg-muted">4</span>
            <p class="book-dialog__progress-text">Collect your book</p>
          </div>
        </div>

        <p class="rounded-lg bg-muted p-4 text-sm text-muted-foreground">You're sending a request, not booking a pickup. Nothing is submitted until you confirm below.</p>

        <div class="grid gap-6 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <div class="space-y-3">
            <p class="book-dialog__small-muted">Your selected copy</p>
            <AppBookIdentity :title="dialogBook.title" :author="getAuthors(dialogBook)" :cover="dialogBook.coverurl" coverClass="w-32" />
          </div>

          <div class="space-y-5 rounded-xl border p-5">
            <h3 class="font-heading text-2xl">Requesting as</h3>

            <dl class="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
              <dt class="book-dialog__muted">Reader</dt>
              <dd class="break-words">{{ auth.user?.name || 'Reader' }}</dd>
              <dt class="book-dialog__muted">Email</dt>
              <dd class="break-all">{{ auth.user?.email || 'Not available' }}</dd>
            </dl>

            <div class="space-y-3 border-t pt-5">
              <h4 class="font-heading text-xl">The team reviews each request</h4>
              <p class="book-dialog__small-muted">You're asking for this donated copy, free of charge. Submitting doesn't reserve it. If approved, you can arrange a pickup time.</p>
              <p class="book-dialog__small-muted">You can follow the response in My Adoptions.</p>
            </div>

            <p v-if="actionMessage" class="book-dialog__success" role="status">{{ actionMessage }}</p>
            <p v-if="actionError" class="book-dialog__error" role="alert">{{ actionError }}</p>

            <Button class="w-full" :disabled="actionLoading || requestSubmitted || !!existingApplication || !!applicationsError" @click="requestCopy">
              {{ requestSubmitted ? 'Request Submitted' : actionLoading ? 'Submitting...' : 'Submit Request' }}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
