<script setup>
import { h, ref, computed, reactive, nextTick, onBeforeUnmount, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Delete02Icon, PencilEdit02Icon } from '@hugeicons/core-free-icons';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';
import CustomerBookCard from '@/components/customer/CustomerBookCard.vue';
import WatchlistCommentToast from '@/components/customer/WatchlistCommentToast.vue';

const watchlist = ref([]);
const savedIds = computed(() => new Set(watchlist.value.map(entry => entry.bookid?.id).filter(Boolean)));
const notes = computed(() => new Map(watchlist.value.map(entry => [entry.bookid?.id, entry.comments])));
const entriesByBook = computed(() => new Map(watchlist.value.map(entry => [entry.bookid?.id, entry])));
const loading = ref(true);
const error = ref('');
const dialogs = ref(null);
const noteToasts = new Set();
const deleting = reactive(new Set());
let controller;

//@sree-sanjana06 > load saved books belonging to logged-in customer
async function loadWatchlist() {
  controller?.abort();
  const request = new AbortController();
  controller = request;
  loading.value = true;
  error.value = '';
  try {
    const result = await api('/watchlist', { method: 'GET', signal: request.signal });
    if (request.signal.aborted) return;
    if (!Array.isArray(result.watchlist)) throw new Error('could not load your saved books > please try again');
    watchlist.value = result.watchlist;
  } catch (err) {
    if (request.signal.aborted) return;
    error.value = err.message;
  } finally {
    if (controller === request) loading.value = false;
  }
}

//@sree-sanjana06 > open edit popup with existing private note
//@sree-sanjana06 > ask for confirmation before deleting saved entry
function openEntry(entry) {
  const id = `watchlist-note-${entry.id}`;
  const trigger = document.activeElement;
  noteToasts.add(id);
  toast.custom(() => h(WatchlistCommentToast, {
    entry, toastId: id, trigger, editing: true, onSaved: updateNote,
  }), { id, duration: Infinity, style: { pointerEvents: 'auto' } });
}

async function editPreviewNote(book) {
  const entry = entriesByBook.value.get(book?.id);
  if (!entry || deleting.has(entry.id)) return;
  dialogs.value?.closeBookDetails();
  await nextTick();
  openEntry(entry);
}

//@sree-sanjana06 > update displayed note without reloading the page
function updateNote({ id, comments }) {
  watchlist.value = watchlist.value.map(entry => entry.id === id ? { ...entry, comments } : entry);
}

function removePreviewBook(book) {
  const entry = entriesByBook.value.get(book?.id);
  if (entry) return removeEntry(entry, true);
}

async function removeEntry(entry, closePreview = false) {
  if (deleting.has(entry.id)) return;
  deleting.add(entry.id);
  try {
    await api(`/watchlist/${entry.id}`, { method: 'DELETE' });
    watchlist.value = watchlist.value.filter(item => item.id !== entry.id);
    toast.success('removed from watchlist');
    if (closePreview) dialogs.value?.closeBookDetails(entry.bookid);
  } catch (failure) {
    toast.error(failure.message);
  } finally {
    deleting.delete(entry.id);
  }
}

onMounted(loadWatchlist);
onBeforeUnmount(() => {
  controller?.abort();
  noteToasts.forEach(id => toast.dismiss(id));
});
</script>

<template>
  <main class="mx-auto w-full max-w-7xl space-y-8">
    <!--@sree-sanjana06 > watchlist heading and total saved books-->
    <header class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-4xl">My Watchlist</h1>
        <p v-if="!loading && !error" class="text-sm text-muted-foreground" role="status">
          {{ watchlist.length }} saved {{ watchlist.length === 1 ? 'book' : 'books' }}
        </p>
      </div>
      <p class="text-muted-foreground text-sm">your saved books and private notes saving doesn't reserve a copy</p>
    </header>

    <section v-if="loading" class="grid auto-rows-fr gap-5 md:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      <CustomerBookCard v-for="index in 8" :key="index" loading />
    </section>
    <div v-else-if="error" class="space-y-4 rounded-xl border bg-card p-5" role="alert">
      <h2 class="text-xl">We couldn’t load your watchlist</h2>
      <p class="text-destructive text-sm">{{ error }}</p>
      <Button variant="outline" @click="loadWatchlist">Try Again</Button>
    </div>
    <!--@sree-sanjana06 > show empty state after removing the final saved book-->
    <div v-else-if="!watchlist.length" class="washi-tape space-y-4 rounded-xl border bg-card p-8 text-center" data-active>
      <h2>Your shelf is waiting</h2>
      <p class="text-sm text-muted-foreground">save a book while browsing to find it here later</p>
      <Button asChild><RouterLink :to="{ name: 'customerBooks' }">Browse books</RouterLink></Button>
    </div>
    <!--@sree-sanjana06 > each card emits actions handled by this page-->
    <!--@sree-sanjana06 > display saved books using shared customer card-->
    <section v-else class="grid auto-rows-fr gap-5 md:grid-cols-2 lg:grid-cols-4">
      <CustomerBookCard v-for="entry in watchlist" :key="entry.id" :book="entry.bookid" variant="watchlist"
        :busy="deleting.has(entry.id)" @preview="dialogs?.openBookDetails($event)" @remove="removeEntry(entry)" />
    </section>

    <!--@sree-sanjana06 > reuse existing Book Details popup-->
    <!--@sree-sanjana06 > existing book details and adoption request popups-->
    <CustomerBookDialogs ref="dialogs" :savedIds="savedIds">
      <template #book-action="{ book }">
        <button type="button" class="rounded-lg p-2 text-destructive" title="Remove from watchlist"
          :disabled="deleting.has(entriesByBook.get(book?.id)?.id)" @click="removePreviewBook(book)">
          <HugeiconsIcon :icon="Delete02Icon" class="size-6" aria-hidden="true" />
          <span class="sr-only">Remove from watchlist</span>
        </button>
      </template>
      <template #details="{ book }">
        <section class="space-y-2">
          <h3>Your private note</h3>
          <p class="text-muted-foreground">{{ notes.get(book?.id) || 'no note added yet' }}</p>
        </section>
      </template>
      <template #extra-actions="{ book }">
        <Button variant="outline" class="size-9 shrink-0 p-0" title="Edit note"
          :disabled="deleting.has(entriesByBook.get(book?.id)?.id)" @click="editPreviewNote(book)">
          <HugeiconsIcon :icon="PencilEdit02Icon" class="size-4" aria-hidden="true" />
          <span class="sr-only">Edit note</span>
        </Button>
      </template>
    </CustomerBookDialogs>
  </main>
</template>
