<script setup>
import { computed, h, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import CustomerBookCard from '@/components/customer/CustomerBookCard.vue';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';
import WatchlistCommentToast from '@/components/customer/WatchlistCommentToast.vue';

//@sree-sanjana06 > catalogue, watchlist and book details dialog
const props = defineProps({
  books: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
});
const dialogs = ref(null);
const watchlist = ref([]);
const watchlistLoading = ref(true);
const watchlistError = ref(false);
const saving = reactive(new Map());
const busyIds = computed(() => new Set(saving.keys()));
const canSave = computed(() => !watchlistLoading.value && !watchlistError.value);
let watchlistcontroller;
const commentToasts = new Set();

//@sree-sanjana06 > saved-book lookup
const savedIds = computed(() => {
  const ids = new Set(watchlist.value.map(entry => entry.bookid?.id).filter(Boolean));
  for (const [id, saved] of saving) {
    if (saved) ids.add(id);
    else ids.delete(id);
  }
  return ids;
});

function showSavedToast(entry, trigger) {
  const id = `watchlist-comment-${entry.bookid.id}`;
  commentToasts.add(id);
  toast.custom(() => h(WatchlistCommentToast, { entry, trigger, toastId: id }), {
    id, duration: Infinity, style: { pointerEvents: 'auto' },
  });
}

//@sree-sanjana06 > fetch saved books to identify existing watchlist entries
async function loadWatchlist() {
  watchlistcontroller?.abort();
  const request = new AbortController();
  watchlistcontroller = request;
  watchlistLoading.value = true;
  watchlistError.value = false;
  try {
    const response = await api('/watchlist', { method: 'GET', signal: request.signal });
    watchlist.value = response.watchlist || [];
  } catch (error) {
    if (request.signal.aborted) return;
    watchlistError.value = true;
    toast.error(error.message, { duration: Infinity, closeButton: true, action: { label: 'retry', onClick: loadWatchlist } });
  } finally {
    if (watchlistcontroller === request) watchlistLoading.value = false;
  }
}

//@1ejun6 > change bookmark immediately > clearing pending state restores saved value if request fails
async function toggleSave(book) {
  if (watchlistLoading.value || watchlistError.value || saving.has(book.id)) return;
  const trigger = document.activeElement;
  const entry = watchlist.value.find(item => item.bookid?.id === book.id);
  saving.set(book.id, !entry);
  try {
    if (entry) {
      await api(`/watchlist/${entry.id}`, { method: 'DELETE' });
      watchlist.value = watchlist.value.filter(item => item.id !== entry.id);
      toast.dismiss(`watchlist-comment-${book.id}`);
      toast.success('removed from watchlist');
    } else {
      const response = await api('/watchlist', { method: 'POST', body: { bookid: book.id, comments: '' } });
      const savedEntry = { ...response.entry, bookid: book };
      watchlist.value.push(savedEntry);
      showSavedToast(savedEntry, trigger);
    }
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.delete(book.id);
  }
}

onMounted(loadWatchlist);
onBeforeUnmount(() => {
  watchlistcontroller?.abort();
  commentToasts.forEach(id => toast.dismiss(id));
});
</script>

<template>
  <section v-if="props.loading || props.books.length" class="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
