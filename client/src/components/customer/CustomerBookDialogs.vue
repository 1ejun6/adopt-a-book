<script setup>
import { ref, computed, nextTick } from 'vue';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

//@sree-sanjana06 > enable watchlist management buttons only on Watchlist page
const props = defineProps({
  watchlist: { type: Array, required: true },
  manageWatchlist: { type: Boolean, default: false }
});
const emit = defineEmits(['saved', 'edit', 'remove']);

//@sree-sanjana06 > all three popups share the currently selected book
const dialogBook = ref(null);
const dialogOpen = ref(false);
const saveDialogOpen = ref(false);
const requestDialogOpen = ref(false);
const detailsLoading = ref(false);
const detailsError = ref('');
const actionLoading = ref(false);
const actionMessage = ref('');
const actionError = ref('');
const requestSubmitted = ref(false);
const savedThisSession = ref(false);
const watchlistNote = ref('');

//@sree-sanjana06 > find saved entry matching the book currently displayed
const savedEntry = computed(() => props.watchlist.find(
  entry => entry.bookid?.id === dialogBook.value?.id
));

const alreadySaved = computed(() => savedThisSession.value || props.watchlist.some(
  entry => entry.bookid?.id === dialogBook.value?.id
));
function getAuthors(book) {
  return Array.isArray(book?.authors) && book.authors.length
    ? book.authors.join(', ') : 'Unknown author';
}

//@sree-sanjana06 > called by Home.vue when a customer clicks a bookshelf preview
async function openBookDetails(book) {
  dialogBook.value = book;
  dialogOpen.value = true;
  detailsLoading.value = true;
  detailsError.value = '';
  actionMessage.value = '';
  actionError.value = '';
  requestSubmitted.value = false;
  savedThisSession.value = false;
  try {
    const result = await api(`/books/${book.id}`);
    dialogBook.value = result.book;
  } catch (error) {
    detailsError.value = error.message;
  } finally {
    detailsLoading.value = false;
  }
}
defineExpose({ openBookDetails });

//@sree-sanjana06 > close book details and ask Watchlist page to edit saved note
async function editSavedBook() {
  if (!savedEntry.value) return;
  const entry = savedEntry.value;
  dialogOpen.value = false;
  await nextTick();
  emit('edit', entry);
}

//@sree-sanjana06 > close book details and ask Watchlist page to confirm removal
async function removeSavedBook() {
  if (!savedEntry.value) return;
  const entry = savedEntry.value;
  dialogOpen.value = false;
  await nextTick();
  emit('remove', entry);
}

//@sree-sanjana06 > close details before showing the optional watchlist note popup
async function openSaveDialog() {
  if (!dialogBook.value || detailsLoading.value || detailsError.value || alreadySaved.value) return;
  watchlistNote.value = '';
  actionError.value = '';
  actionMessage.value = '';
  dialogOpen.value = false;
  await nextTick();
  saveDialogOpen.value = true;
}

//@sree-sanjana06 > save the book and optional comment using existing POST /watchlist
async function saveToWatchlist() {
  if (!dialogBook.value || actionLoading.value || alreadySaved.value || watchlistNote.value.length > 300) return;
  actionLoading.value = true;
  actionError.value = '';
  actionMessage.value = '';
  try {
    await api('/watchlist', {
      method: 'POST',
      body: { bookid: dialogBook.value.id, comments: watchlistNote.value.trim() }
    });
    savedThisSession.value = true;
    actionMessage.value = 'Book saved to your watchlist.';
    try {
      const result = await api('/watchlist');
      emit('saved', result.watchlist || []);
    } catch {
      //@sree-sanjana06 > saving succeeded even if refreshing the carousel fails
      actionMessage.value = 'Book saved, but the watchlist could not refresh. Reload to see it.';
    }
  } catch (error) {
    actionError.value = error.message;
  } finally {
    actionLoading.value = false;
  }
}

//@sree-sanjana06 > open request review; do not submit until confirmation button is clicked
async function openRequestDialog() {
  if (!dialogBook.value || detailsLoading.value || detailsError.value || requestSubmitted.value) return;
  actionError.value = '';
  actionMessage.value = '';
  dialogOpen.value = false;
  await nextTick();
  requestDialogOpen.value = true;
}

//@sree-sanjana06 > submit one adoption request through existing POST /applications
async function requestCopy() {
  if (!dialogBook.value || actionLoading.value || requestSubmitted.value) return;
  actionLoading.value = true;
  actionError.value = '';
  actionMessage.value = '';
  try {
    await api('/applications', {
      method: 'POST', body: { bookid: dialogBook.value.id }
    });
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
  <!--@sree-sanjana06 > full book details uses existing shared identity and status badge-->
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="w-[calc(100vw-2rem)] max-w-4xl p-0" :showCloseButton="false">
      <DialogHeader class="flex flex-row items-center justify-between border-b p-5">
        <DialogTitle class="font-heading text-3xl">Book details</DialogTitle>
        <Button variant="outline" @click="dialogOpen = false">Close</Button>
      </DialogHeader>
      <div v-if="dialogBook" class="space-y-6 p-6">
        <p v-if="detailsLoading" class="text-muted-foreground">Loading book details...</p>
        <p v-if="detailsError" class="text-sm text-destructive">{{ detailsError }}</p>
        <div class="space-y-5">
          <AppBookIdentity :title="dialogBook.title" :author="getAuthors(dialogBook)"
            :cover="dialogBook.coverurl" coverClass="w-32" />
          <AppStatusBadge v-if="dialogBook.status" :status="dialogBook.status" />
          <p v-if="dialogBook.description" class="text-muted-foreground">{{ dialogBook.description }}</p>
          
          <!--@sree-sanjana06 > show metadata only when available in the book record-->
          <dl class="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3">
            <template v-if="dialogBook.subjects?.length">
              <dt class="text-muted-foreground">Subjects</dt>
              <dd>{{ dialogBook.subjects.join(', ') }}</dd>
            </template>
            <template v-if="dialogBook.publicationyear">
              <dt class="text-muted-foreground">Published</dt>
              <dd>{{ dialogBook.publicationyear }}</dd>
            </template>
            <template v-if="dialogBook.isbn">
              <dt class="text-muted-foreground">ISBN</dt>
              <dd>{{ dialogBook.isbn }}</dd>
            </template>
            <template v-if="dialogBook.condition">
              <dt class="text-muted-foreground">Condition</dt>
              <dd class="capitalize">{{ dialogBook.condition }}</dd>
            </template>
            <template v-if="dialogBook.collectionarea">
              <dt class="text-muted-foreground">Collection</dt>
              <dd>{{ dialogBook.collectionarea }}</dd>
            </template>
          </dl>
        </div>
        <div class="space-y-4 border-t pt-5">
          <h3 class="font-heading text-xl">A book, not a checkout.</h3>
          <p class="text-muted-foreground">
            Request this donated copy for free. The team reviews your request before you arrange collection.
          </p>
          
          <!--@sree-sanjana06 > show management actions for books already in Watchlist-->
          <div class="grid gap-3"
            :class="manageWatchlist && savedEntry ? 'sm:grid-cols-3' : 'sm:grid-cols-2'">

            <!--@sree-sanjana06 > existing adoption request functionality-->
            <Button
              :disabled="actionLoading || detailsLoading || !!detailsError || dialogBook.status !== 'available' || requestSubmitted"
              @click="openRequestDialog">
              {{ requestSubmitted ? 'Request submitted' : 'Request copy' }}
            </Button>

            <!--@sree-sanjana06 > replace Save button with Edit and Remove on Watchlist page-->
            <template v-if="manageWatchlist && savedEntry">
              <Button variant="outline" @click="editSavedBook">
                Edit saved book
              </Button>
              <Button variant="outline" @click="removeSavedBook">
                Remove from watchlist
              </Button>
            </template>

            <!--@sree-sanjana06 > retain original Save button for Home and other pages-->
            <Button v-else variant="outline"
              :disabled="actionLoading || detailsLoading || !!detailsError || dialogBook.status !== 'available' || alreadySaved"
              @click="openSaveDialog">
              {{ alreadySaved ? 'Already saved' : 'Save to watchlist' }}
            </Button>
          </div>

        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!--@sree-sanjana06 > save popup includes optional note, max 300 characters-->
  <Dialog v-model:open="saveDialogOpen">
    <DialogContent class="max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto p-0" :showCloseButton="false">
      <DialogHeader class="flex flex-row items-center justify-between border-b p-5">
        <DialogTitle class="font-heading text-3xl">Save book</DialogTitle>
        <Button variant="outline" @click="saveDialogOpen = false">Close</Button>
      </DialogHeader>
      <div v-if="dialogBook" class="space-y-6 p-6">
        <AppBookIdentity :title="dialogBook.title" :author="getAuthors(dialogBook)"
          :cover="dialogBook.coverurl" coverClass="w-20" />
        <p class="text-muted-foreground">Keep this book in your watchlist. Saving doesn't reserve it.</p>
        <div class="space-y-2">
          <label for="watchlist-note" class="block text-sm">Note (optional)</label>
          <textarea id="watchlist-note" v-model="watchlistNote" maxlength="300" rows="4"
            :disabled="actionLoading || alreadySaved"
            placeholder="Something to remember about this book"
            class="w-full resize-y rounded-lg border bg-background p-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"></textarea>
          <p class="text-sm text-muted-foreground">
            Only visible to you · {{ watchlistNote.length }}/300 characters
          </p>
        </div>
        <p v-if="actionMessage" class="rounded-lg bg-success p-3 text-sm" role="status">{{ actionMessage }}</p>
        <p v-if="actionError" class="text-sm text-destructive" role="alert">{{ actionError }}</p>
        <div class="flex justify-end border-t pt-5">
          <Button :disabled="actionLoading || alreadySaved" @click="saveToWatchlist">
            {{ alreadySaved ? 'Saved' : actionLoading ? 'Saving...' : 'Save' }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <!--@sree-sanjana06 > request review popup; progress tracker only a visual not actually changing-->
  <Dialog v-model:open="requestDialogOpen">
    <DialogContent class="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto p-0" :showCloseButton="false">
      <DialogHeader class="flex flex-row items-center justify-between border-b p-5">
        <DialogTitle class="font-heading text-3xl">Request a copy</DialogTitle>
        <Button variant="outline" @click="requestDialogOpen = false">Close</Button>
      </DialogHeader>
      <div v-if="dialogBook" class="space-y-6 p-6">
        <div class="grid grid-cols-4 gap-2 sm:gap-4">
          <div class="space-y-2 border-t-2 border-green-700 pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-green-100 text-green-800">✓</span>
            <p class="text-xs sm:text-sm">Choose a book</p>
          </div>
          <div class="space-y-2 border-t-2 border-foreground pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-foreground text-background">2</span>
            <p class="text-xs font-semibold sm:text-sm">Request &amp; review</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full bg-muted">3</span>
            <p class="text-xs sm:text-sm">Arrange pickup</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full bg-muted">4</span>
            <p class="text-xs sm:text-sm">Collect your book</p>
          </div>
        </div>
        <p class="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          You're sending a request, not booking a pickup. Nothing is submitted until you confirm below.
        </p>
        <div class="grid gap-6 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <div class="space-y-3">
            <p class="text-sm text-muted-foreground">Your selected copy</p>
            <AppBookIdentity :title="dialogBook.title" :author="getAuthors(dialogBook)"
              :cover="dialogBook.coverurl" coverClass="w-32" />
          </div>
          <div class="space-y-5 rounded-xl border p-5">
            <h3 class="font-heading text-2xl">Requesting as</h3>
            <dl class="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
              <dt class="text-muted-foreground">Reader</dt>
              <dd class="break-words">{{ auth.user?.name || 'Reader' }}</dd>
              <dt class="text-muted-foreground">Email</dt>
              <dd class="break-all">{{ auth.user?.email || 'Not available' }}</dd>
            </dl>
            <div class="space-y-3 border-t pt-5">
              <h4 class="font-heading text-xl">The team reviews each request</h4>
              <p class="text-sm text-muted-foreground">
                You're asking for this donated copy, free of charge. Submitting doesn't reserve it.
                If your request is approved, you can arrange a pickup time.
              </p>
              <p class="text-sm text-muted-foreground">You can follow the response in My Adoptions.</p>
            </div>
            <p v-if="actionMessage" class="rounded-lg bg-success p-3 text-sm" role="status">{{ actionMessage }}</p>
            <p v-if="actionError" class="text-sm text-destructive" role="alert">{{ actionError }}</p>
            <Button class="w-full" :disabled="actionLoading || requestSubmitted" @click="requestCopy">
              {{ requestSubmitted ? 'Request submitted' : actionLoading ? 'Submitting...' : 'Submit request' }}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
