<script setup>
import { ref, computed, onBeforeUnmount, onMounted } from 'vue';
import { api } from '@/lib/api';
import { RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';
import CustomerBookCard from '@/components/customer/CustomerBookCard.vue';
import WatchlistEntryDialog from '@/components/customer/WatchlistEntryDialog.vue';

const watchlist = ref([]);
const savedIds = computed(() => new Set(watchlist.value.map(entry => entry.bookid?.id).filter(Boolean)));
const loading = ref(true);
const error = ref('');
const dialogs = ref(null);
const selectedEntry = ref(null);
const entryAction = ref('edit');
const entryDialogOpen = ref(false);
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
function openEntry(entry, action) {
  selectedEntry.value = entry;
  entryAction.value = action;
  entryDialogOpen.value = true;
}

//@sree-sanjana06 > update displayed note without reloading the page
function updateNote({ id, comments }) {
  watchlist.value = watchlist.value.map(entry => entry.id === id ? { ...entry, comments } : entry);
}

function removeEntry(id) {
  watchlist.value = watchlist.value.filter(entry => entry.id !== id);
}

onMounted(loadWatchlist);
onBeforeUnmount(() => controller?.abort());
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

    <section v-if="loading" class="grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
      <CustomerBookCard v-for="index in 6" :key="index" loading />
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
    <section v-else class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <CustomerBookCard v-for="entry in watchlist" :key="entry.id" :book="entry.bookid" variant="watchlist"
        :comment="entry.comments || ''" @preview="dialogs?.openBookDetails($event)" @remove="openEntry(entry, 'remove')"
        @edit="openEntry(entry, 'edit')" />
    </section>

    <!--@sree-sanjana06 > reuse existing Book Details popup-->
    <!--@sree-sanjana06 > existing book details and adoption request popups-->
    <CustomerBookDialogs ref="dialogs" :savedIds="savedIds" />
    <WatchlistEntryDialog v-model:open="entryDialogOpen" :entry="selectedEntry" :action="entryAction"
      @saved="updateNote" @removed="removeEntry" />
  </main>
</template>
