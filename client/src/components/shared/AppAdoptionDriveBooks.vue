<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import { api } from '@/lib/api';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';

const props = defineProps({ stationId: { type: String, required: true } });
const bookLimit = 5;
const books = ref([]);
const totalBooks = ref(0);
const loadingBooks = ref(false);
const bookError = ref('');
let bookController;
let bookRequestId = 0;

function cancelBooks() {
  bookRequestId++;
  bookController?.abort();
  loadingBooks.value = false;
}

onBeforeUnmount(cancelBooks);

//@brod > Fetch books when dialog opens
async function fetchBooks() {
  cancelBooks();
  const id = bookRequestId;
  const stationId = props.stationId;
  books.value = [];
  totalBooks.value = 0;
  bookError.value = '';
  if (!stationId) {
    books.value = [];
    totalBooks.value = 0;
    return;
  }
  const request = new AbortController();
  bookController = request;
  loadingBooks.value = true;
  bookError.value = '';
  try {
    const response = await api('/books', {
      method: 'GET',
      signal: request.signal,
      query: {
        mrtstationids: stationId,
        status: 'available',
        limit: bookLimit,
      }
    });
    if (id !== bookRequestId) return;
    books.value = response.books || [];
    totalBooks.value = response.total || 0;
  } catch (error) {
    if (id !== bookRequestId || request.signal.aborted) return;
    bookError.value = error.message;
    toast.error(error.message, { duration: Infinity, style: { pointerEvents: 'auto' }, action: { label: 'retry', onClick: fetchBooks } });
  } finally {
    if (id === bookRequestId) loadingBooks.value = false;
  }
}

watch(() => props.stationId, fetchBooks, { immediate: true });
</script>

<template>
  <section class="space-y-2.5">
    <h3>book list</h3>

    <ul v-if="loadingBooks" class="space-y-2.5">
      <li v-for="i in 3" :key="i">
        <AppBookIdentity loading />
      </li>
    </ul>

    <div v-else-if="bookError" class="space-y-2.5" role="alert">
      <p class="text-sm">{{ bookError }}</p>
      <Button type="button" variant="outline" size="sm" @click="fetchBooks">retry book list</Button>
    </div>
    <p v-else-if="!books.length" class="text-sm">no available books at this station yet</p>
    <template v-else-if="!bookError">
      <ul class="space-y-2.5">
        <li v-for="book in books" :key="book.id">
          <AppBookIdentity :title="book.title" :author="book.authors?.join(', ')" :cover="book.coverurl" />
        </li>
      </ul>
      <p v-if="totalBooks > books.length" class="text-sm">
        & {{ totalBooks - books.length }} more
      </p>
    </template>
  </section>
</template>
