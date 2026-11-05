<script setup>
import { useVisibleRefresh } from '@/composables/useVisibleRefresh';
import { onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
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
const auth = useAuthStore(),
  watchlist = useWatchlistStore();
const adoptions = useAdoptionsStore();
const { entries, savedIds, loading: savedLoading, loadError: savedError } = storeToRefs(watchlist);
const { busyIds, toggleBook } = useSavedBookActions();
const preferredgenres = ref([]);
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
    const response = await api('/customer/shelf', {
      signal: controller.signal,
    });
    if (current !== generation) return;
    if (!Array.isArray(response.books)) throw new Error('Could not load available books.');
    preferredgenres.value = response.preferredgenres || [];
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
    preferredgenres.value = [];
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
onBeforeUnmount(() => {
  generation++;
  controller?.abort();
});
useVisibleRefresh(loadShelf, { busy: () => loading.value });
</script>

<template>
  <AppPage class="customer-home">
    <header class="intro">
      <p>Your reading corner</p>
      <h1>What will you read next?</h1>
      <p>Find your next read.</p>
    </header>
    <section aria-labelledby="shelf-heading" class="discovery">
      <div class="section-heading">
        <div>
          <h2 id="shelf-heading">On the shelf</h2>
          <p class="shelf-note">{{ preferredgenres.length ? 'Based on your favourite genres' : 'Discover your next favourite read' }}</p>
        </div>
        <button
          type="button"
          class="inline-flex size-14 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent p-0"
          aria-label="Random"
          title="Random"
          :disabled="loading || !!error || pool.length < 2"
          @click="shuffle()"
          ><img :src="dice" alt="" class="size-9" /></button
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
      <div v-else class="state">
        <p>No available books match your favourite genres right now.</p>
        <div class="flex flex-wrap gap-2.5">
          <Button asChild><RouterLink :to="{ name: 'customerBooks' }">Browse all books</RouterLink></Button>
          <Button asChild variant="outline"><RouterLink :to="{ name: 'customerAccount' }">Change favourite genres</RouterLink></Button>
        </div>
      </div>
      <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
      <RouterLink v-if="loading || error || selection.length" :to="{ name: 'customerBooks' }" class="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Browse all books</RouterLink>
    </section>
    <section aria-labelledby="saved-heading" class="saved-section">
      <div v-if="savedLoading || savedError || !entries.length" class="section-heading">
        <h2 id="saved-heading">Saved books</h2>
        <Button asChild variant="outline"><RouterLink :to="{ name: 'customerWatchlist' }">View saved books</RouterLink></Button>
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
        :request-ids="adoptions.existingRequestIds"
        @select="dialogs?.openBookDetails($event)"
        @remove="toggle"
      >
        <template #heading>
          <h2 id="saved-heading">Saved books</h2>
        </template>
      </CustomerSavedCarousel>
      <p v-else class="state">
        Saved books appear here. Saving doesn’t reserve a copy.
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
  gap: 1rem;
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
