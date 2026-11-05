import { computed, nextTick, ref } from 'vue';
import { useWatchlistStore } from '@/stores/watchlist';
import { useConfirmation } from '@/lib/confirmation';

//@lee-hlmilk > all saved-book entry points protect private notes before removing the captured copy
export function useSavedBookActions() {
  const store = useWatchlistStore();
  const { confirm } = useConfirmation();
  const confirmingIds = ref(new Set());
  const busyIds = computed(() => new Set([...store.pendingOperations.keys(), ...confirmingIds.value]));

  async function removeEntry(entry) {
    const id = entry.id, bookId = entry.bookid.id;
    const trigger = document.activeElement;
    if (busyIds.value.has(bookId)) return null;
    confirmingIds.value.add(bookId);
    try {
      if (entry.comments?.trim() && !await confirm('Remove saved book?', {
        description: `Removing ${entry.bookid.title} also deletes its private note.`,
        actionLabel: 'Remove saved book', cancelLabel: 'Keep book', destructive: true,
      })) return null;
      if (store.entriesByBook.get(bookId)?.id !== id) return null;
      const result = await store.removeEntry(id);
      await nextTick();
      if (!trigger?.isConnected) {
        const heading = document.querySelector('main h1');
        heading?.setAttribute('tabindex', '-1');
        heading?.focus({ preventScroll: true });
      }
      return result;
    } finally {
      confirmingIds.value.delete(bookId);
    }
  }

  function toggleBook(book) {
    if (busyIds.value.has(book.id)) return Promise.resolve(null);
    const entry = store.entriesByBook.get(book.id);
    return entry ? removeEntry(entry) : store.toggleBook(book);
  }
  const savingIds = computed(() => new Set(store.pendingOperations.keys()));
  return { busyIds, savingIds, removeEntry, toggleBook };
}
