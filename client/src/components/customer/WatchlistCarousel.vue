
<script setup>
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';

defineProps({
  watchlist: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
});
const emit = defineEmits(['retry']);
const watchlistTrack = ref(null);

//@sree-sanjana06 > scroll carousel left (-1) or right (1)
function scrollWatchlist(direction) {
  watchlistTrack.value?.scrollBy({ left: direction * 280, behavior: 'smooth' });
}
function getAuthors(book) {
  return Array.isArray(book?.authors) && book.authors.length
    ? book.authors.join(', ') : 'Unknown author';
}
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="space-y-1">
        <h2 class="font-heading text-3xl">Still on your mind?</h2>
        <p class="text-sm text-muted-foreground">The books you saved for later</p>
      </div>
      <!--@sree-sanjana06 > show scroll arrows only when saved books exist-->
      <div v-if="watchlist.length > 0" class="flex items-center gap-2">
        <Button variant="outline" size="sm" aria-label="Previous saved books"
          @click="scrollWatchlist(-1)">←</Button>
        <Button variant="outline" size="sm" aria-label="Next saved books"
          @click="scrollWatchlist(1)">→</Button>
      </div>
    </div>

    <p v-if="loading" class="text-muted-foreground">Loading your saved books...</p>
    <div v-else-if="error" class="space-y-3">
      <p class="text-muted-foreground">{{ error }}</p>
      <Button variant="outline" @click="emit('retry')">Try Again</Button>
    </div>
    <div v-else-if="watchlist.length === 0" class="rounded-xl border bg-card p-8 text-center">
      <h3 class="font-heading text-xl">Nothing saved just yet</h3>
      <p class="mt-2 text-sm text-muted-foreground">Books you save to your watchlist will appear here.</p>
    </div>

    <!--@sree-sanjana06 > backend returns each saved book inside entry.bookid-->
    <div v-else ref="watchlistTrack" class="flex gap-4 overflow-x-auto pb-4" aria-label="Saved books">
      <article v-for="entry in watchlist" :key="entry.id"
        class="w-64 shrink-0 space-y-3 rounded-xl border bg-card p-4">
        <AppBookIdentity v-if="entry.bookid" :title="entry.bookid.title"
          :author="getAuthors(entry.bookid)" :cover="entry.bookid.coverurl" />
        <p v-if="entry.comments" class="text-sm text-muted-foreground">{{ entry.comments }}</p>
        <p v-if="entry.bookid?.status" class="text-xs capitalize text-muted-foreground">
          {{ entry.bookid.status }}
        </p>
      </article>
    </div>
  </section>
</template>
