<script setup>
import { ref, nextTick } from 'vue';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import RequestCopyDialog from '@/components/customer/RequestCopyDialog.vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import './CustomerBookDialogs.css';

// ==================== SHARED BOOK DETAILS ====================

//@sree-sanjana06 > keep existing props and events for compatibility with parent pages
defineProps({
  watchlist: { type: Array, required: true },
  manageWatchlist: { type: Boolean, default: false }
});
defineEmits(['saved', 'edit']);

//@sree-sanjana06 > shared by Home, Browse Books and Watchlist
const dialogBook = ref(null);
const dialogOpen = ref(false);
const detailsLoading = ref(false);
const detailsError = ref('');

//@sree-sanjana06 > request popup is handled separately by RequestCopyDialog.vue
const requestDialogOpen = ref(false);
const requestSubmitted = ref(false);

//@sree-sanjana06 > display authors as readable text
function getAuthors(book) {
  return Array.isArray(book?.authors) && book.authors.length
    ? book.authors.join(', ')
    : 'Unknown author';
}

//@sree-sanjana06 > clean Open Library references from descriptions
function cleanDescription(description) {
  if (typeof description !== 'string') return '';

  return description
    .split(/\(?\[source\](?:\[\d+\])?\)?/i)[0]
    .split(/\n\s*(?:Preceded by:|Followed by:|Contains:|-{4,}|\[\d+\]:\s*https?:\/\/)/i)[0]
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// ==================== SHARED BOOK PREVIEW ====================

//@sree-sanjana06 > open book details from Home, Browse Books or Watchlist
async function openBookDetails(book) {
  dialogBook.value = book;
  dialogOpen.value = true;
  detailsLoading.value = true;
  detailsError.value = '';
  requestSubmitted.value = false;

  try {
    const result = await api(`/books/${book.id}`);
    dialogBook.value = result.book;
  } catch (error) {
    detailsError.value = error.message;
  } finally {
    detailsLoading.value = false;
  }
}

//@sree-sanjana06 > expose book preview to parent pages
defineExpose({ openBookDetails });

// ==================== REQUEST COPY CONNECTION ====================

//@sree-sanjana06 > close Book Details before opening teammate's Request Copy popup
async function openRequestDialog() {
  if (!dialogBook.value || detailsLoading.value || detailsError.value || requestSubmitted.value) return;

  dialogOpen.value = false;
  await nextTick();
  requestDialogOpen.value = true;
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
          <!--@sree-sanjana06 > shared book identity-->
          <AppBookIdentity :title="dialogBook.title" :author="getAuthors(dialogBook)" :cover="dialogBook.coverurl" coverClass="w-32" />

          <!--@sree-sanjana06 > cleaned description-->
          <div class="space-y-2">
            <h3 class="font-heading text-xl">Description</h3>
            <p v-if="cleanDescription(dialogBook.description)" class="book-dialog__description">{{ cleanDescription(dialogBook.description) }}</p>
            <p v-else class="book-dialog__small-muted italic">No description available.</p>
          </div>

          <!--@sree-sanjana06 > show available metadata-->
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

        <!-- ==================== REQUEST COPY ENTRY POINT ==================== -->
        <!--@sree-sanjana06 > only the trigger stays here; request functionality is in RequestCopyDialog.vue-->
        <div class="space-y-4 border-t pt-5">
          <h3 class="font-heading text-xl">A book, not a checkout.</h3>
          <p class="book-dialog__muted">Request this donated copy for free. The team reviews your request before you arrange collection.</p>
          <Button class="w-full" :disabled="detailsLoading || !!detailsError || dialogBook.status !== 'available' || requestSubmitted" @click="openRequestDialog">
            {{ requestSubmitted ? 'Request submitted' : 'Request Book' }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <RequestCopyDialog v-model:open="requestDialogOpen" :book="dialogBook" @submitted="requestSubmitted = true" />
</template>
