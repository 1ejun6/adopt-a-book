<script setup>
import { ref, computed, nextTick } from 'vue';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { toast } from 'vue-sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const props = defineProps({ savedIds: { type: Set, default: () => new Set() } });
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

async function loadApplications() {
  applicationsLoading.value = true;
  applicationsError.value = '';
  try {
    const response = await api('/applications', { method: 'GET' });
    if (!Array.isArray(response.adoptionapplications)) throw new Error('could not check adoption requests > try again');
    applications.value = response.adoptionapplications;
  } catch (error) {
    applications.value = [];
    applicationsError.value = error.message;
    throw error;
  } finally {
    applicationsLoading.value = false;
  }
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

async function openBookDetails(book, options = {}) {
  if (!book?.id) return;
  viewOnly.value = options.viewOnly === true;
  dialogBook.value = book;
  dialogOpen.value = true;
  requestDialogOpen.value = false;
  detailsLoading.value = true;
  detailsError.value = '';
  requestSubmitted.value = false;
  applications.value = [];
  applicationsError.value = '';

  try {
    const response = await api(`/books/${book.id}`, { method: 'GET' });
    dialogBook.value = response.book;
  } catch (error) {
    detailsError.value = error.message;
    showerror(error, () => openBookDetails(book, options));
  } finally {
    detailsLoading.value = false;
  }

  if (!viewOnly.value && !detailsError.value) {
    try {
      await loadApplications();
      if (existingApplication.value) toast.info('you already requested this copy > check my adoptions', { style: { pointerEvents: 'auto' } });
      else if (dialogBook.value?.status !== 'available') toast.info('this book is unavailable for requests', { style: { pointerEvents: 'auto' } });
    } catch (error) {
      showerror(error, () => openBookDetails(book, options));
    }
  }
}

async function openRequestDialog() {
  if (!canRequestBook.value) return;
  dialogOpen.value = false;
  await nextTick();
  requestDialogOpen.value = true;
}

async function requestCopy() {
  if (!dialogBook.value || actionLoading.value || requestSubmitted.value || viewOnly.value) return;
  actionLoading.value = true;
  try {
    await loadApplications();
    if (existingApplication.value) {
      toast.info('you already requested this copy > check my adoptions', { style: { pointerEvents: 'auto' } });
      return;
    }
    if (dialogBook.value.status !== 'available') {
      toast.info('this book is no longer available for requests', { style: { pointerEvents: 'auto' } });
      return;
    }
    await api('/applications', { method: 'POST', body: { bookid: dialogBook.value.id } });
    requestSubmitted.value = true;
    applications.value.push({ bookid: dialogBook.value.id, status: 'pending' });
    toast.success('adoption request submitted', { style: { pointerEvents: 'auto' } });
  } catch (error) {
    showerror(error, requestCopy);
  } finally {
    actionLoading.value = false;
  }
}

defineExpose({ openBookDetails });
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
          <AppBookIdentity :title="dialogBook.title" :author="getAuthors(dialogBook)" :cover="dialogBook.coverurl" coverClass="w-16" />
          <Badge v-if="props.savedIds.has(dialogBook.id)" variant="green">saved to watchlist</Badge>

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
          <p class="text-muted-foreground">Request this donated copy for free. The team reviews your request before you arrange collection.</p>


          <Button class="w-full" :disabled="!canRequestBook" @click="openRequestDialog">{{ requestButtonLabel }}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <Dialog v-model:open="requestDialogOpen">
    <DialogContent class="max-h-[90vh] max-w-5xl p-0">
      <DialogHeader class="border-b p-5 pr-20">
        <DialogTitle class="text-3xl">Request a copy</DialogTitle>
        <DialogDescription class="sr-only">{{ dialogBook?.title }}</DialogDescription>
      </DialogHeader>

      <div v-if="dialogBook" class="space-y-6 p-6">

        <!--@sree-sanjana06 > request progress tracker-->
        <div class="grid grid-cols-4 gap-2 sm:gap-4">
          <div class="space-y-2 border-t-2 border-green-700 pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-green-100 text-green-800">✓</span>
            <p class="text-xs sm:text-sm">Choose a book</p>
          </div>
          <div class="space-y-2 border-t-2 border-foreground pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-foreground text-background">2</span>
            <p class="text-xs sm:text-sm font-semibold">Request &amp; review</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full">3</span>
            <p class="text-xs sm:text-sm">Arrange pickup</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full">4</span>
            <p class="text-xs sm:text-sm">Collect your book</p>
          </div>
        </div>

        <p class="rounded-lg p-4 text-muted-foreground">You're sending a request, not booking a pickup. Nothing is submitted until you confirm below.</p>

        <div class="grid gap-6 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <div class="space-y-3">
            <p class="text-muted-foreground">Your selected copy</p>
            <AppBookIdentity :title="dialogBook.title" :author="getAuthors(dialogBook)" :cover="dialogBook.coverurl" coverClass="w-32" />
          </div>

          <div class="space-y-5 rounded-xl border p-5">
            <h3 class="text-2xl">Requesting as</h3>

            <dl class="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
              <dt class="text-muted-foreground">Reader</dt>
              <dd class="break-words">{{ auth.user?.name || 'Reader' }}</dd>
              <dt class="text-muted-foreground">Email</dt>
              <dd class="break-all">{{ auth.user?.email || 'Not available' }}</dd>
            </dl>

            <div class="space-y-3 border-t pt-5">
              <h4 class="text-xl">The team reviews each request</h4>
              <p class="text-muted-foreground">You're asking for this donated copy, free of charge. Submitting doesn't reserve it. If approved, you can arrange a pickup time.</p>
              <p class="text-muted-foreground">You can follow the response in My Adoptions.</p>
            </div>


            <Button class="w-full" :disabled="actionLoading || requestSubmitted || !!existingApplication || !!applicationsError" @click="requestCopy">
              {{ requestSubmitted ? 'Request Submitted' : actionLoading ? 'Submitting...' : 'Submit Request' }}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
