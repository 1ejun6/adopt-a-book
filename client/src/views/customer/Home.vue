<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { useVisibleRefresh } from '@/composables/useVisibleRefresh';
import { h, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSavedBookActions } from '@/composables/useSavedBookActions';
import { useAdoptionsStore } from '@/stores/adoptions';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useWatchlistStore } from '@/stores/watchlist';
import AppPage from '@/components/shared/AppPage.vue';
import CustomerShelf from '@/components/books/BookShelf.vue';
import CustomerSavedCarousel from '@/components/customer/CustomerSavedCarousel.vue';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import dice from '@/assets/dice.svg';
const router = useRouter();
const auth = useAuthStore(),
  watchlist = useWatchlistStore();
const adoptions = useAdoptionsStore();
const { entries, savedIds, loading: savedLoading, loadError: savedError } = storeToRefs(watchlist);
const { busyIds, savingIds, toggleBook } = useSavedBookActions();
const preferredgenres = ref(auth.user?.preferredgenres || []);
const pool = ref([]),
  selection = ref([]),
  loading = ref(true),
  error = ref(''),
  announcement = ref(''),
  dialogs = ref(null);
let emptyToastId, lastEmptyKey;
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
    const response = await api('/customer/shelf', {
      signal: controller.signal,
    });
    if (current !== generation) return;
    if (!Array.isArray(response.books)) throw new Error('Could not load available books.');
    preferredgenres.value = response.preferredgenres || [];
    pool.value = [
      ...new Map(
        response.books
          .filter((book) => book?.id && book.status === 'available' && !savedIds.value.has(book.id))
          .map((book) => [book.id, book]),
      ).values(),
    ].slice(0, 100);
    if (!selection.value.length) {
      shuffle(false);
    } else {
      // Refresh book data without changing the selection the reader is looking at.
      const available = new Map(pool.value.map(book => [book.id, book]));
      const retained = selection.value.map(book => available.get(book.id)).filter(Boolean);
      const retainedIds = new Set(retained.map(book => book.id));
      selection.value = [...retained, ...pool.value.filter(book => !retainedIds.has(book.id))].slice(0, 5);
    }
    const emptyKey = JSON.stringify([auth.user?.id, preferredgenres.value]);
    if (selection.value.length) {
      if (emptyToastId !== undefined) { toast.dismiss(emptyToastId); emptyToastId = undefined; }
      lastEmptyKey = undefined;
    } else if (lastEmptyKey !== emptyKey) {
      lastEmptyKey = emptyKey;
      if (emptyToastId !== undefined) toast.dismiss(emptyToastId);
      const navigate = destination => {
        toast.dismiss(emptyToastId);
        void router.push(destination);
      };
      emptyToastId = toast.info(() => h('div', { class: 'space-y-2.5' }, [
        h('p', 'No matches on your shelf just yet'),
        h('div', { class: 'flex flex-wrap gap-2.5' }, [
          h(Button, { type: 'button', size: 'sm', onClick: () => navigate({ name: 'customerBooks', query: { genregroup: 'other' } }) },
            () => [h(AppIcon, { name: 'book' }), 'Explore books']),
          h(Button, { type: 'button', size: 'sm', variant: 'outline', onClick: () => navigate({ name: 'customerAccount', hash: '#preferences' }) },
            () => [h(AppIcon, { name: 'edit' }), 'Favourite genres']),
        ]),
      ]), { duration: Infinity });
    }
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
    const result = await toggleBook(book);
    if (!result) return;
    toast.success(result.removed ? 'Removed from saved books' : 'Book saved');
  } catch (failure) {
    toast.error(failure.message);
  }
}
watch(
  () => auth.user?.id,
  () => {
    preferredgenres.value = auth.user?.preferredgenres || [];
    pool.value = [];
    selection.value = [];
    announcement.value = '';
    dialogs.value?.closeBookDetails();
    void loadShelf();
    void loadSaved();
    void adoptions.fetchApplications().catch(() => { /* Details retains its retryable request check. */ });
  },
  { immediate: true },
);
watch(() => `${[...savedIds.value].sort().join(',')}:${watchlist.pendingOperations.size}`,  () => {
  pool.value = pool.value.filter(book => !savedIds.value.has(book.id));
  selection.value = selection.value.filter(book => !savedIds.value.has(book.id));
  void loadShelf();
});
watch(() => JSON.stringify(auth.user?.preferredgenres), () => { void loadShelf(); });
onBeforeUnmount(() => {
  if (emptyToastId !== undefined) toast.dismiss(emptyToastId);
  generation++;
  controller?.abort();
});
useVisibleRefresh(loadShelf, { busy: () => loading.value });
</script>

<template>
  <AppPage class="customer-home">
    <header class="intro app-page-heading text-center">
      <p>your reading corner</p>
      <h1>What Will You Read Next?</h1>
      <p>find your next read.</p>
    </header>
    <section aria-labelledby="shelf-heading" class="discovery">
      <div class="section-heading">
        <div>
          <h2 id="shelf-heading">On the shelf</h2>
          <p class="shelf-note">{{ preferredgenres.length ? 'based on your favourite genres' : 'discover your next favourite read' }}</p>
        </div>
        <button
          type="button"
          class="inline-flex size-14 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0"
          aria-label="Random"
          :disabled="loading || !!error || pool.length < 2"
          @click="shuffle()"
          ><img :src="dice" alt="" class="size-9" /></button
        >
      </div>
      <div v-if="error" class="state" role="alert">
        <p>{{ error }}</p>
        <Button variant="outline" @click="loadShelf" :loading="loading"><AppIcon name="refresh" /><span class="sr-only">Retry available books</span></Button>
      </div>
      <CustomerShelf
        v-else
        showEmptyBooks
        :books="selection"
        :loading="loading"
        :saved-ids="savedIds"
        @select="dialogs?.openBookDetails($event)"
      />
      <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
    </section>
    <section aria-labelledby="saved-heading" class="saved-section">
      <div v-if="savedLoading || savedError || !entries.length" class="section-heading">
        <h2 id="saved-heading">Watchlist</h2>
      </div>
      <div
        v-if="savedLoading && !entries.length"
        class="saved-loading"
        aria-busy="true"
        aria-label="Loading saved books"
      >
        <Skeleton v-for="index in 3" :key="index" class="h-60 rounded-xl" />
      </div>
      <div v-else-if="savedError" class="state" role="alert">
        <p>{{ savedError }}</p>
        <Button variant="outline" @click="loadSaved" :loading="savedLoading"><AppIcon name="refresh" /><span class="sr-only">Retry saved books</span></Button>
      </div>
      <CustomerSavedCarousel
        v-else-if="entries.length"
        :entries="entries"
        :busy-ids="busyIds" :saving-ids="savingIds"
        :request-ids="adoptions.existingRequestIds"
        @select="dialogs?.openBookDetails($event)"
        @remove="toggle"
      >
        <template #heading>
          <h2 id="saved-heading">Watchlist</h2>
        </template>
      </CustomerSavedCarousel>
      <p v-else class="state">
        Saved books appear here. Saving doesn’t reserve a copy.
      </p>
    </section>
    <CustomerBookDialogs
      ref="dialogs"
      :saved-ids="savedIds"
      :busy-ids="busyIds" :saving-ids="savingIds"
      :can-save="watchlist.loaded && !savedLoading && !savedError"
      @save="toggle"
    />
  </AppPage>
</template>

<style scoped>
.customer-home {
  display: grid;
  align-content: start;
  gap: 1.25rem;
}
.saved-section {
  min-width: 0;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.discovery {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem;
  display: grid;
  align-content: start;
  gap: 1rem;
}
.discovery > .section-heading {
  min-height: 3.5rem;
}
.shelf-note {
  margin-top: 0.375rem;
  font-size: 0.875rem;
  color: var(--muted-foreground);
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
</style>
