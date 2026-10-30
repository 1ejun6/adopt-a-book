<script setup>
import { ref, nextTick } from 'vue';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import './CustomerBookDialogs.css';

// ==================== SHARED BOOK DETAILS ====================

//@sree-sanjana06 > keep existing props and events for compatibility with parent pages
defineProps({
  watchlist: { type: Array, required: true },
  manageWatchlist: { type: Boolean, default: false }});
defineEmits(['saved', 'edit']);

//@sree-sanjana06 > shared by Home, Browse Books and Watchlist
const dialogBook = ref(null);
const dialogOpen = ref(false);
const detailsLoading = ref(false);
const detailsError = ref('');

// ==================== BROWSE BOOKS / REQUEST BOOK ====================

//@sree-sanjana06 > request confirmation and submission states
const requestDialogOpen = ref(false);
const requestSubmitted = ref(false);
const actionLoading = ref(false);
const actionMessage = ref('');
const actionError = ref('');

//@sree-sanjana06 > convert author array into readable text
function getAuthors(book) {
  return Array.isArray(book?.authors) && book.authors.length
    ? book.authors.join(', ')
    : 'Unknown author';}

//@sree-sanjana06 > remove Open Library references and format synopsis as one paragraph
function cleanDescription(description) {
  if (typeof description !== 'string') return '';

  return description
    .split(/\(?\[source\](?:\[\d+\])?\)?/i)[0]
    .split(/\n\s*(?:Preceded by:|Followed by:|Contains:|-{4,}|\[\d+\]:\s*https?:\/\/)/i)[0]
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();}

// ==================== SHARED BOOK PREVIEW ====================

//@sree-sanjana06 > open book details from Home, Browse Books or Watchlist
async function openBookDetails(book) {
  dialogBook.value = book;
  dialogOpen.value = true;
  detailsLoading.value = true;
  detailsError.value = '';
  actionMessage.value = '';
  actionError.value = '';
  requestSubmitted.value = false;

  try {
    const result = await api(`/books/${book.id}`);
    dialogBook.value = result.book;
  } catch (error) {
    detailsError.value = error.message;
  } finally {
    detailsLoading.value = false;
  }}

//@sree-sanjana06 > allow parent components to open book details
defineExpose({ openBookDetails });

// ==================== REQUEST BOOK FUNCTIONS ====================

//@sree-sanjana06 > open request review before submitting
async function openRequestDialog() {
  if (!dialogBook.value || detailsLoading.value || detailsError.value || requestSubmitted.value) return;

  actionError.value = '';
  actionMessage.value = '';
  dialogOpen.value = false;

  await nextTick();
  requestDialogOpen.value = true;
}

//@sree-sanjana06 > submit adoption request through existing API
async function requestCopy() {
  if (!dialogBook.value || actionLoading.value || requestSubmitted.value) return;

  actionLoading.value = true;
  actionError.value = '';
  actionMessage.value = '';

  try {
    await api('/applications', { method: 'POST', body: { bookid: dialogBook.value.id } });
    requestSubmitted.value = true;
    actionMessage.value = 'Adoption request submitted successfully.';
  } catch (error) {
    actionError.value = error.message;
  } finally {
    actionLoading.value = false;
  }
}
</script>

<template>
  <!-- ==================== SHARED BOOK DETAILS POPUP ==================== -->
  <!--@sree-sanjana06 > shared preview for Home, Browse Books and Watchlist-->
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
          <!--@sree-sanjana06 > shared book identity and availability-->
          <AppBookIdentity :title="dialogBook.title" :author="getAuthors(dialogBook)" :cover="dialogBook.coverurl" coverClass="w-32" />

          <!--@sree-sanjana06 > cleaned description only appears in popup-->
          <div class="space-y-2">
            <h3 class="font-heading text-xl">Description</h3>
            <p v-if="cleanDescription(dialogBook.description)" class="book-dialog__description">{{ cleanDescription(dialogBook.description) }}</p>
            <p v-else class="book-dialog__small-muted italic">No description available.</p>
          </div>

          <!--@sree-sanjana06 > show available book metadata-->
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

        <!--@sree-sanjana06 > only Request Book appears in book details-->
        <div class="space-y-4 border-t pt-5">
          <h3 class="font-heading text-xl">A book, not a checkout.</h3>
          <p class="book-dialog__muted">Request this donated copy for free. The team reviews your request before you arrange collection.</p>
          <Button class="w-full" :disabled="actionLoading || detailsLoading || !!detailsError || dialogBook.status !== 'available' || requestSubmitted" @click="openRequestDialog">
            {{ requestSubmitted ? 'Request submitted' : 'Request Book' }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!-- ==================== REQUEST BOOK POPUP ==================== -->
  <!--@sree-sanjana06 > review and confirm adoption request-->
  <Dialog v-model:open="requestDialogOpen">
    <DialogContent class="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto p-0" :showCloseButton="false">
      <DialogHeader class="flex flex-row items-center justify-between border-b p-5">
        <DialogTitle class="font-heading text-3xl">Request a copy</DialogTitle>
        <Button variant="outline" @click="requestDialogOpen = false">Close</Button>
      </DialogHeader>

      <div v-if="dialogBook" class="space-y-6 p-6">
        <!--@sree-sanjana06 > visual progress tracker-->
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

        <!--@sree-sanjana06 > explain that requests do not reserve books-->
        <p class="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          You're sending a request, not booking a pickup. Nothing is submitted until you confirm below.
        </p>

        <div class="grid gap-6 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <!--@sree-sanjana06 > selected book summary-->
          <div class="space-y-3">
            <p class="book-dialog__small-muted">Your selected copy</p>
            <AppBookIdentity :title="dialogBook.title" :author="getAuthors(dialogBook)" :cover="dialogBook.coverurl" coverClass="w-32" />
          </div>

          <!--@sree-sanjana06 > customer and request information-->
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
              <p class="book-dialog__small-muted">
                You're asking for this donated copy, free of charge. Submitting doesn't reserve it.
                If your request is approved, you can arrange a pickup time.
              </p>
              <p class="book-dialog__small-muted">You can follow the response in My Adoptions.</p>
            </div>

            <!--@sree-sanjana06 > request submission feedback-->
            <p v-if="actionMessage" class="book-dialog__success" role="status">{{ actionMessage }}</p>
            <p v-if="actionError" class="book-dialog__error" role="alert">{{ actionError }}</p>

            <Button class="w-full" :disabled="actionLoading || requestSubmitted" @click="requestCopy">
              {{ requestSubmitted ? 'Request submitted' : actionLoading ? 'Submitting...' : 'Submit request' }}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
