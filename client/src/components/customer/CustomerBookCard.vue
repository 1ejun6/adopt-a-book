<script setup>
import { Skeleton } from '@/components/ui/skeleton';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { RouterLink } from 'vue-router';
import { HugeiconsIcon } from '@hugeicons/vue';
import {
  Bookmark02Icon,
  Delete02Icon
} from '@hugeicons/core-free-icons';

//@sree-sanjana06 > reuse card for browse books and watchlist
const props = defineProps({
  book: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  variant: { type: String, default: 'browse' },
  saved: { type: Boolean, default: false },
  requestId: { type: String, default: '' },
  busy: { type: Boolean, default: false }
});

//@sree-sanjana06 > parent handles book preview and watchlist removal
const emit = defineEmits(['preview', 'remove', 'save', 'unsave']);

//@sree-sanjana06 > convert author array into readable text
function getAuthors(book) {
  return Array.isArray(book.authors) && book.authors.length
    ? book.authors.join(', ') : 'Unknown author';
}

function handleAction(book) {
  if (props.variant === 'watchlist') {
    emit('remove');
  } else {
    emit(props.saved ? 'unsave' : 'save', book);
  }
}
</script>

<template>

  <!--@1ejun6 > use same card layout while loading > no clickable placeholder -->
  <article v-if="loading" class="h-full space-y-2.5 rounded-xl border p-4" role="status" aria-busy="true">
    <div class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <Skeleton class="h-4 w-1/3" />
        <Skeleton class="size-6" />
      </div>
      <AppBookIdentity loading vertical coverClass="h-32 w-full" />
    </div>
    <Skeleton class="h-4 w-2/3" />
  </article>

  <!--@sree-sanjana06 > allow cards to size naturally without unnecessary empty space-->
  <article v-else-if="book" class="washi-tape-hover flex h-full min-w-0 flex-col gap-2.5 rounded-xl border p-4">
    <!--@sree-sanjana06 > shared book cover, title and author-->
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <p v-if="book.subjects?.length" class="truncate text-sm text-muted-foreground" :title="book.subjects[0]">{{ book.subjects[0] }}</p>
        <!--@sree-sanjana06 > save directly or request removal when already saved-->
        <!--@sree-sanjana06 > remove saved book from watchlist-->
        <button type="button" class="ml-auto min-h-11 min-w-11 shrink-0 rounded-lg p-2" :class="{ 'text-destructive': variant === 'watchlist' }"
          :disabled="busy" :title="variant === 'watchlist' || saved ? 'Remove from watchlist' : 'Save to watchlist'"
          :aria-label="`${variant === 'watchlist' || saved ? 'Remove' : 'Save'} ${book.title} ${variant === 'watchlist' || saved ? 'from' : 'to'} saved books`"
          :aria-pressed="variant === 'browse' ? saved : undefined" @click.stop="handleAction(book)">
          <HugeiconsIcon v-if="variant === 'watchlist'" :icon="Delete02Icon" class="size-5" aria-hidden="true" />
          <HugeiconsIcon v-else :icon="Bookmark02Icon" class="size-5" :class="{ 'fill-success-foreground text-success-foreground': saved }" aria-hidden="true" />
        </button>
      </div>
      <!--@lee-hlmilk > details and save are independent keyboard controls > no button contains another button -->
      <button type="button" class="min-h-11 w-full rounded-lg text-left" aria-haspopup="dialog" :aria-label="`View details for ${book.title}`" @click="emit('preview', book)">
        <AppBookIdentity :title="book.title" :author="getAuthors(book)" :cover="book.thumbnailurl || book.coverurl" coverClass="h-32 w-full" wrap vertical />
      </button>
    </div>

    <!--@1ejun6 > shared metadata styles > missing fields do not reserve empty rows -->
      <div class="mt-auto min-h-5 text-sm text-muted-foreground">
        <p v-if="variant === 'watchlist'" class="text-foreground">{{ book.status === 'available' ? 'Available to request' : 'Unavailable for new requests' }}</p>
        <p>Collection: {{ book.collectionarea || book.mrtstation?.name || 'Not provided' }}</p>
        <RouterLink v-if="props.requestId" class="inline-flex min-h-11 items-center underline underline-offset-4" :to="{ name: 'customerAdoptions', query: { request: props.requestId } }">View my request<span class="sr-only"> for {{ book.title }}</span></RouterLink>
      </div>

    <!--@sree-sanjana06 > personal notes are managed only in watchlist-->
  </article>
</template>
