<script setup>
import CustomerBookAvailability from '@/components/customer/CustomerBookAvailability.vue';
import AppIcon from '@/components/shared/AppIcon.vue';
import AppPage from '@/components/shared/AppPage.vue';
import AppPagination from '@/components/shared/AppPagination.vue';
import AppSearchInput from '@/components/shared/AppSearchInput.vue';
import { getPageCount } from '@/lib/utils';
import { useSavedBookActions } from '@/composables/useSavedBookActions';
import { useAdoptionsStore } from '@/stores/adoptions';
import { h, ref, computed, watch, onBeforeUnmount, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import { useWatchlistStore } from '@/stores/watchlist';
import { storeToRefs } from 'pinia';
import { RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Delete02Icon, PencilEdit02Icon } from '@hugeicons/core-free-icons';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';
import CustomerBookCard from '@/components/customer/CustomerBookCard.vue';
import CustomerSavedBookCard from '@/components/customer/CustomerSavedBookCard.vue';
import WatchlistCommentToast from '@/components/customer/WatchlistCommentToast.vue';

const store = useWatchlistStore();
const adoptions = useAdoptionsStore();
const { entries: watchlist, savedIds, commentsByBook: notes, entriesByBook, loading, loadError: error } = storeToRefs(store);
const { busyIds, savingIds, removeEntry: removeSavedEntry } = useSavedBookActions();
const deleting = computed(() => new Set(store.entries.filter(entry => busyIds.value.has(entry.bookid?.id)).map(entry => entry.id)));
const page = ref(1);
const pageSize = 16;
const search = ref('');
const availability = ref('all');
const filteredEntries = computed(() => {
  const query = search.value.trim().toLowerCase();
  return watchlist.value.filter(({ bookid: book }) => {
    const status = adoptions.existingRequestIds.has(book?.id)
      ? 'requested'
      : book?.status === 'available' ? 'available' : 'unavailable';
    return (availability.value === 'all' || availability.value === status)
      && (!query || [book?.title, ...(book?.authors || []), book?.isbn]
        .some(value => String(value ?? '').toLowerCase().includes(query)));
  });
});
const pageCount = computed(() => getPageCount(filteredEntries.value.length, pageSize));
const visibleEntries = computed(() => filteredEntries.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch([search, availability], () => { page.value = 1; });
watch(pageCount, count => { page.value = Math.min(page.value, count); });
const dialogs = ref(null);
const noteToasts = new Set();
async function loadWatchlist() {
  try { await store.fetchWatchlist({ force: true }); } catch { /* Render the store's load error and retry button. */ }
}

//@sree-sanjana06 > open edit popup with existing private note
//@sree-sanjana06 > ask for confirmation before deleting saved entry
function openEntry(entry) {
  const id = `watchlist-note-${entry.id}`;
  const trigger = document.activeElement;
  noteToasts.add(id);
  toast.custom(() => h(WatchlistCommentToast, {
    entry, toastId: id, trigger, editing: true,
  }), { id, duration: Infinity, style: { pointerEvents: 'auto' } });
}

function editPreviewNote(book) {
  const entry = entriesByBook.value.get(book?.id);
  if (!entry || deleting.value.has(entry.id)) return;
  openEntry(entry);
}

function removePreviewBook(book) {
  const entry = entriesByBook.value.get(book?.id);
  if (entry) return removeEntry(entry, true);
}

async function removeEntry(entry, closePreview = false) {
  if (deleting.value.has(entry.id)) return;
  try {
    const result = await removeSavedEntry(entry);
    if (!result) return;
    toast.success('Removed from saved books');
    if (closePreview) dialogs.value?.closeBookDetails(entry.bookid);
  } catch (failure) {
    toast.error(failure.message);

  }
}

onMounted(loadWatchlist);
onMounted(() => adoptions.fetchApplications().catch(() => { /* Details retains its retryable request check. */ }));
onBeforeUnmount(() => { noteToasts.forEach(id => toast.dismiss(id)); });
</script>

<template>
  <AppPage class="flex flex-1 flex-col gap-5">
    <header class="app-page-heading text-center">
      <h1>Watchlist</h1>
      <p>your saved books and private notes</p>
    </header>

    <div class="flex flex-1 flex-col gap-5">
    <CustomerBookAvailability legend class="justify-end" />
    <div class="flex flex-col gap-2.5 sm:flex-row">
      <AppSearchInput v-model="search" id="watchlist-search" aria-label="Search watchlist" class="min-w-0 flex-1"
        placeholder="Search by title, author or ISBN..." :disabled="loading && !watchlist.length" />
      <label for="watchlist-availability" class="sr-only">Book availability</label>
      <select id="watchlist-availability" v-model="availability"
        class="min-h-11 w-full rounded-lg border bg-transparent p-2.5 text-sm sm:w-52"
        :disabled="loading && !watchlist.length">
        <option value="all">All</option>
        <option value="available">Available</option>
        <option value="unavailable">Unavailable</option>
        <option value="requested">Requested</option>
      </select>
    </div>
    <section v-if="loading && !watchlist.length" class="grid shrink-0 auto-rows-fr gap-5 md:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      <CustomerBookCard v-for="index in 8" :key="index" loading />
    </section>
    <div v-else-if="error" class="space-y-4 rounded-xl border bg-card p-5" role="alert">
      <h2 class="text-xl">We couldn’t load your saved books</h2>
      <p class="text-destructive text-sm">{{ error }}</p>
      <Button variant="outline" @click="loadWatchlist" :loading="loading"><AppIcon name="refresh" /><span class="sr-only">Try again</span></Button>
    </div>
    <!--@sree-sanjana06 > show empty state after removing the final saved book-->
    <div v-else-if="!watchlist.length" class="space-y-4 rounded-xl border bg-card p-8 text-center" data-active>
      <h2>Your shelf is waiting</h2>
      <p class="text-sm text-muted-foreground">save a book while browsing to find it here later</p>
      <Button asChild><RouterLink :to="{ name: 'customerBooks' }"><AppIcon name="book" />Browse books</RouterLink></Button>
    </div>
    <p v-else-if="!filteredEntries.length" class="text-sm text-muted-foreground" role="status">
      no matching books in your watchlist. try another search or change the availability filter.
    </p>
    <!--@sree-sanjana06 > each card emits actions handled by this page-->
    <!--@sree-sanjana06 > display saved books using shared customer card-->
    <section v-else :aria-busy="loading" class="grid shrink-0 auto-rows-fr gap-5 md:grid-cols-2 lg:grid-cols-4">
      <CustomerSavedBookCard v-for="entry in visibleEntries" :key="entry.id" :book="entry.bookid"
        :requestId="adoptions.existingRequestIds.get(entry.bookid.id)"
        :saving="savingIds.has(entry.bookid.id)" :busy="deleting.has(entry.id)" @preview="dialogs?.openBookDetails($event)" @remove="removeEntry(entry)" />
    </section>

    <AppPagination class="mt-auto" v-model:page="page" itemLabel="books" :total="filteredEntries.length"
      :visibleCount="visibleEntries.length" :pageSize="pageSize" :loading="loading" :disabled="loading || !!error" />
    </div>

    <!--@sree-sanjana06 > reuse existing Book Details popup-->
    <!--@sree-sanjana06 > existing book details and adoption request popups-->
    <CustomerBookDialogs ref="dialogs" :savedIds="savedIds">
      <template #book-action="{ book }">
        <Button variant="outline" :loading="savingIds.has(book?.id)" type="button" class="border-0 bg-transparent min-h-11 min-w-11 rounded-lg p-2 text-destructive"
          :disabled="deleting.has(entriesByBook.get(book?.id)?.id)" @click="removePreviewBook(book)">
          <HugeiconsIcon :icon="Delete02Icon" class="size-6" aria-hidden="true" />
          <span class="sr-only">Remove from saved books</span>
        </Button>
      </template>
      <template #secondary-action="{ book }">
        <Button type="button" variant="outline" class="min-w-0 w-full" aria-label="Edit note"
          :disabled="deleting.has(entriesByBook.get(book?.id)?.id)" @click="editPreviewNote(book)">
          <HugeiconsIcon :icon="PencilEdit02Icon" class="size-4" aria-hidden="true" />
        </Button>
      </template>
      <template #details="{ book }">
        <section class="space-y-1.5 border-y py-5">
          <h3>Your private note</h3>
          <p class="text-sm text-muted-foreground break-words">{{ notes.get(book?.id) || 'no note added yet' }}</p>
        </section>
      </template>
    </CustomerBookDialogs>
  </AppPage>
</template>
