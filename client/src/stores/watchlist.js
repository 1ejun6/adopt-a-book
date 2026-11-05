import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/lib/api';

export const useWatchlistStore = defineStore('watchlist', () => {
  const entries = ref([]), loaded = ref(false), loading = ref(false), loadError = ref('');
  const pendingOperations = ref(new Map());
  let generation = 0, fetchPromise;
  const controllers = new Set();
  const entriesByBook = computed(() => new Map(entries.value.map((entry) => [entry.bookid?.id, entry])));
  const commentsByBook = computed(() => new Map(entries.value.map((entry) => [entry.bookid?.id, entry.comments])));
  const savedIds = computed(() => {
    const ids = new Set(entriesByBook.value.keys());
    for (const [id, operation] of pendingOperations.value) {
      if (operation === 'save') ids.add(id);
      if (operation === 'remove') ids.delete(id);
    }
    return ids;
  });
  const savedCount = computed(() => savedIds.value.size);
  function reset() {
    generation++;
    controllers.forEach((controller) => controller.abort());
    controllers.clear();
    entries.value = [];
    loaded.value = false;
    loading.value = false;
    loadError.value = '';
    pendingOperations.value = new Map();
    fetchPromise = undefined;
  }
  function fetchWatchlist({ force = false } = {}) {
    if (fetchPromise) return fetchPromise;
    if (loaded.value && !loadError.value && !force) return Promise.resolve(entries.value);
    // Avoid a refresh overwriting mutations that are already in flight.
    if (pendingOperations.value.size) return Promise.reject(new Error('Please wait for your saved books to finish updating'));
    const current = generation, controller = new AbortController();
    controllers.add(controller);
    loading.value = true;
    loadError.value = '';
    fetchPromise = (async () => {
      try {
        const response = await api('/watchlist', { signal: controller.signal });
        if (current !== generation) return;
        if (!Array.isArray(response.watchlist)) throw new Error('could not load your saved books > please try again');
        entries.value = response.watchlist;
        loaded.value = true;
        return entries.value;
      } catch (failure) {
        if (current !== generation) return;
        loadError.value = failure.message;
        throw failure;
      } finally {
        controllers.delete(controller);
        if (current === generation) {
          loading.value = false;
          fetchPromise = undefined;
        }
      }
    })();
    return fetchPromise;
  }
  async function mutate(bookId, operation, endpoint, options, commit) {
    if (pendingOperations.value.has(bookId)) throw new Error('This book is already being updated');
    if (loading.value || !loaded.value) throw new Error('Load your watchlist before updating it');
    const current = generation, controller = new AbortController();
    controllers.add(controller);
    pendingOperations.value.set(bookId, operation);
    try {
      const response = await api(endpoint, { ...options, signal: controller.signal });
      if (current !== generation) throw new Error('Session changed; please try again');
      const receipt = commit(response);
      // Commit the acknowledgement before refreshing. A read failure cannot undo a save.
      pendingOperations.value.delete(bookId);
      if (!pendingOperations.value.size) {
        try { await fetchWatchlist({ force: true }); } catch { /* Inline refresh error remains available. */ }
      }
      if (current !== generation) throw new Error('Session changed; please try again');
      return receipt;
    } finally {
      controllers.delete(controller);
      if (current === generation) pendingOperations.value.delete(bookId);
    }
  }
  function removeEntry(entryId) {
    const entry = entries.value.find((item) => item.id === entryId);
    if (!entry) return Promise.reject(new Error('Saved book no longer available'));
    return mutate(entry.bookid.id, 'remove', `/watchlist/${entryId}`, { method: 'DELETE' }, () => {
      entries.value = entries.value.filter((item) => item.id !== entryId);
      return { removed: true, entry };
    });
  }
  function toggleBook(book) {
    const entry = entriesByBook.value.get(book.id);
    if (entry) return removeEntry(entry.id);
    return mutate(book.id, 'save', '/watchlist', { method: 'POST', body: { bookid: book.id, comments: '' } }, (response) => {
      const entry = { ...response.entry, bookid: { ...book, ...(typeof response.entry.bookid === 'object' ? response.entry.bookid : {}) } };
      entries.value.push(entry);
      return { removed: false, entry };
    });
  }
  function updateComment(entryId, comments) {
    const entry = entries.value.find((item) => item.id === entryId);
    if (!entry) return Promise.reject(new Error('Saved book no longer available'));
    return mutate(entry.bookid.id, 'note', `/watchlist/${entryId}`, { method: 'PATCH', body: { comments } }, () => {
      entry.comments = comments;
      return entry;
    });
  }
  return { entries, loaded, loading, loadError, pendingOperations, savedIds, entriesByBook, commentsByBook, savedCount, fetchWatchlist, toggleBook, removeEntry, updateComment, reset };
});
