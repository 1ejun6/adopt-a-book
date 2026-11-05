<script setup>
import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { useWatchlistStore } from '@/stores/watchlist';
import { storeToRefs } from 'pinia';
import CustomerBookCard from '@/components/customer/CustomerBookCard.vue';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';
import WatchlistCommentToast from '@/components/customer/WatchlistCommentToast.vue';

//@sree-sanjana06 > catalogue, watchlist and book details dialog
const props = defineProps({
  books: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});
const dialogs = ref(null);
const store = useWatchlistStore();
const { savedIds, loading: watchlistLoading, loadError: watchlistError } = storeToRefs(store);
const busyIds = computed(() => new Set(store.pendingOperations.keys()));
const canSave = computed(() => store.loaded && !watchlistLoading.value && !watchlistError.value);
const commentToasts = new Set();

function showSavedToast(entry, trigger) {
  const id = `watchlist-comment-${entry.bookid.id}`;
  commentToasts.add(id);
  toast.custom(() => h(WatchlistCommentToast, { entry, trigger, toastId: id }), {
    id, duration: Infinity, style: { pointerEvents: 'auto' },
  });
}

//@sree-sanjana06 > fetch saved books to identify existing watchlist entries
async function loadWatchlist() {
  try { await store.fetchWatchlist(); }
  catch (error) {
    toast.error(error.message, { duration: Infinity, closeButton: true, action: { label: 'retry', onClick: loadWatchlist } });
  }
}

async function toggleSave(book) {
  if (!canSave.value || busyIds.value.has(book.id)) return;
  const trigger = document.activeElement;
  try {
    const result = await store.toggleBook(book);
    if (result.removed) {
      toast.dismiss(`watchlist-comment-${book.id}`);
      toast.success('removed from watchlist');
    } else showSavedToast(result.entry, trigger);
  } catch (error) { toast.error(error.message); }
}

onMounted(loadWatchlist);
onBeforeUnmount(() => { commentToasts.forEach(id => toast.dismiss(id)); });
</script>

<template>
  <p v-if="watchlistError" role="alert">{{ watchlistError }} <button class="underline min-h-11" :disabled="watchlistLoading" @click="loadWatchlist">Refresh saved books</button></p>
  <section v-if="props.loading || props.books.length" class="grid auto-rows-fr gap-5 md:grid-cols-2 lg:grid-cols-4">
    <template v-if="props.loading">
      <CustomerBookCard v-for="index in 8" :key="index" loading />
    </template>
    <template v-else>
      <CustomerBookCard v-for="book in props.books" :key="book.id" :book="book" :saved="savedIds.has(book.id)"
        :busy="!canSave || busyIds.has(book.id)" @preview="dialogs?.openBookDetails($event)" @save="toggleSave"
        @unsave="toggleSave" />
    </template>
  </section>
  <!--@sree-sanjana06 > shared book details popup; request workflow handled separately-->
  <CustomerBookDialogs ref="dialogs" :savedIds="savedIds" :canSave="canSave" :busyIds="busyIds" @save="toggleSave" />
</template>
