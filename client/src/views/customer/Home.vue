<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useWatchlistStore } from '@/stores/watchlist';
import AppPage from '@/components/shared/AppPage.vue';
import CustomerShelf from '@/components/customer/CustomerShelf.vue';
import CustomerSavedCarousel from '@/components/customer/CustomerSavedCarousel.vue';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import dice from '@/assets/dice.svg';
const auth = useAuthStore(),
  watchlist = useWatchlistStore();
const { entries, savedIds, loading: savedLoading, loadError: savedError } = storeToRefs(watchlist);
const busyIds = computed(() => new Set(watchlist.pendingOperations.keys()));
const pool = ref([]),
  selection = ref([]),
  loading = ref(true),
  error = ref(''),
  announcement = ref(''),
  dialogs = ref(null);
let controller,
  generation = 0,
  shuffleCount = 0;
function shuffle(announce = true) {
  const shuffled = [...pool.value];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  let next = shuffled.slice(0, 5);
  const oldIds = new Set(selection.value.map((book) => book.id));
  if (pool.value.length > 5 && next.every((book) => oldIds.has(book.id))) {
    next[4] = shuffled.find((book) => !oldIds.has(book.id));
  } else if (
    next.length > 1 &&
    next.every((book, index) => book.id === selection.value[index]?.id)
  ) {
    next = [...next.slice(1), next[0]];
  }
  selection.value = next;
  if (announce)
    announcement.value = `Selection ${++shuffleCount}: ${next.map((book) => book.title).join(', ')}.`;
}
async function loadShelf() {
  controller?.abort();
  const current = ++generation;
  controller = new AbortController();
  loading.value = true;
  error.value = '';
  try {
    const response = await api('/books', {
      query: { status: 'available', limit: 100 },
      signal: controller.signal,
    });
    if (current !== generation) return;
    if (!Array.isArray(response.books)) throw new Error('Could not load available books.');
    pool.value = [
      ...new Map(
        response.books
          .filter((book) => book?.id && book.status === 'available')
          .map((book) => [book.id, book]),
      ).values(),
    ].slice(0, 100);
    shuffle(false);
  } catch (failure) {
    if (current === generation) error.value = failure.message;
  } finally {
    if (current === generation) loading.value = false;
  }
}
async function loadSaved() {
  try {
    await watchlist.fetchWatchlist({ force: true });
  } catch {
    /* Store exposes retryable error. */
  }
}
async function toggle(book) {
  try {
    const result = await watchlist.toggleBook(book);
    toast.success(result.removed ? 'Removed from saved books' : 'Book saved');
  } catch (failure) {
    toast.error(failure.message);
  }
}
watch(
  () => auth.user?.id,
  () => {
    pool.value = [];
    selection.value = [];
    announcement.value = '';
    dialogs.value?.closeBookDetails();
    void loadShelf();
    void loadSaved();
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  generation++;
  controller?.abort();
});
</script>

<template>
  <AppPage class="customer-home">
    <header class="intro">
      <p>Your reading corner</p>
      <h1>What will you read next?</h1>
      <p>A little room for your next favourite story.</p>
    </header>
    <section aria-labelledby="shelf-heading" class="discovery">
      <div class="section-heading">
        <h2 id="shelf-heading">Available on the shelf</h2>
        <Button
          variant="outline"
          :disabled="loading || !!error || pool.length < 2"
          @click="shuffle()"
          ><img :src="dice" alt="" class="size-4" />Random</Button
        >
      </div>
      <div v-if="error" class="state" role="alert">
        <p>{{ error }}</p>
        <Button variant="outline" @click="loadShelf">Retry available books</Button>
      </div>
      <CustomerShelf
        v-else-if="loading || selection.length"
        :books="selection"
        :loading="loading"
        :saved-ids="savedIds"
        @select="dialogs?.openBookDetails($event)"
      />
      <p v-else class="state">The shelf is empty for now. Check back for more stories.</p>
      <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
      <RouterLink :to="{ name: 'customerBooks' }" class="browse-link"
        >Browse all books →</RouterLink
      >
    </section>
    <section aria-labelledby="saved-heading" class="saved-section">
      <div class="section-heading">
        <h2 id="saved-heading">Still on your mind?</h2>
      </div>
      <div
        v-if="savedLoading"
        class="saved-loading"
        aria-busy="true"
        aria-label="Loading saved books"
      >
        <Skeleton v-for="index in 3" :key="index" class="h-60 rounded-xl" />
      </div>
      <div v-else-if="savedError" class="state" role="alert">
        <p>{{ savedError }}</p>
        <Button variant="outline" @click="loadSaved">Retry saved books</Button>
      </div>
      <CustomerSavedCarousel
        v-else-if="entries.length"
        :entries="entries"
        :busy-ids="busyIds"
        @select="dialogs?.openBookDetails($event)"
        @remove="toggle"
      />
      <p v-else class="state">
        Save books you love and they’ll appear here. Saving a book doesn’t reserve a copy.
      </p>
    </section>
    <CustomerBookDialogs
      ref="dialogs"
      :saved-ids="savedIds"
      :busy-ids="busyIds"
      :can-save="watchlist.loaded && !savedLoading && !savedError"
      @save="toggle"
    />
  </AppPage>
</template>

<style scoped>
.customer-home {
  max-width: 64rem;
  display: grid;
  gap: 3rem;
}
.saved-section {
  min-width: 0;
}
.intro {
  text-align: center;
  display: grid;
  gap: 0.75rem;
  padding-top: 1rem;
}
.intro h1 {
  font-size: clamp(2rem, 5vw, 3rem);
}
.intro p {
  font-size: 0.95rem;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.section-heading h2 {
  font-size: clamp(1.25rem, 3vw, 1.75rem);
}
.discovery {
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  padding: clamp(1rem, 4vw, 2rem);
}
.browse-link {
  display: block;
  width: fit-content;
  margin: 1.5rem auto 0;
  text-decoration: underline;
  text-underline-offset: 4px;
  font-size: 0.875rem;
}
.state {
  padding: 2rem 0;
  display: grid;
  gap: 1rem;
  justify-items: start;
  font-size: 0.95rem;
}
.saved-loading {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-top: 1rem;
}
@media (prefers-reduced-motion: reduce) {
  .saved-loading :deep(*) {
    animation: none;
  }
}
</style>
