<script setup>
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { HugeiconsIcon } from '@hugeicons/vue';
import {
  Bookmark02Icon,
  Delete02Icon
} from '@hugeicons/core-free-icons';

//@sree-sanjana06 > reuse card for browse books and watchlist
defineProps({
  book: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  variant: { type: String, default: 'browse' },
  saved: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  comment: { type: String, default: '' }
});

//@sree-sanjana06 > parent handles book preview and watchlist removal
const emit = defineEmits(['preview', 'remove', 'save', 'unsave', 'edit']);

//@sree-sanjana06 > convert author array into readable text
function getAuthors(book) {
  return Array.isArray(book.authors) && book.authors.length
    ? book.authors.join(', ') : 'Unknown author';
}
</script>

<template>

  <!--@1ejun6 > use same card layout while loading > no clickable placeholder -->
  <article v-if="loading" class="space-y-3 rounded-xl border p-5" role="status" aria-busy="true">
    <div class="flex items-start gap-3">
      <AppBookIdentity loading coverClass="w-24" class="flex-1" />
      <Skeleton class="size-6" />
    </div>
    <Skeleton class="h-4 w-1/3" />
    <Skeleton class="h-4 w-1/2" />
    <Skeleton class="h-4 w-1/3" />
  </article>

  <!--@sree-sanjana06 > allow cards to size naturally without unnecessary empty space-->
  <article v-else-if="book" class="washi-tape washi-tape-hover cursor-pointer space-y-3 rounded-xl border p-5" role="button" tabindex="0" aria-haspopup="dialog" @click="emit('preview', book)" @keydown.enter.self.prevent="emit('preview', book)" @keydown.space.self.prevent="emit('preview', book)">
    <!--@sree-sanjana06 > shared book cover, title and author-->
    <div class="flex items-start gap-3">
      <AppBookIdentity :title="book.title" :author="getAuthors(book)" :cover="book.coverurl" coverClass="w-24" class="flex-1" />

      <!--@sree-sanjana06 > save directly or request removal when already saved-->
      <button v-if="variant === 'browse'" type="button" class="shrink-0 rounded-lg p-2" :disabled="busy" :title="saved ? 'Remove from watchlist' : 'Save to watchlist'" :aria-pressed="saved" @click.stop="emit(saved ? 'unsave' : 'save', book)">
        <HugeiconsIcon :icon="Bookmark02Icon" class="size-6" :class="{ 'fill-success-foreground text-success-foreground': saved }" aria-hidden="true" />
      </button>

      <!--@sree-sanjana06 > remove saved book from watchlist-->
      <button v-if="variant === 'watchlist'" type="button" class="shrink-0 rounded-lg p-2 text-destructive" title="Remove from watchlist" aria-label="Remove from watchlist" @click.stop="emit('remove')">
        <HugeiconsIcon :icon="Delete02Icon" class="size-6" aria-hidden="true" />
      </button>
    </div>

    <!--@1ejun6 > shared metadata styles > missing fields do not reserve empty rows -->
    <div class="space-y-3 text-xs text-muted-foreground">
      <p v-if="book.subjects?.length">{{ book.subjects[0] }}</p>
      <p v-if="book.collectionarea">Collection: {{ book.collectionarea }}</p>
      <p>condition: {{ book.condition || 'not listed' }}</p>
    </div>

    <!--@sree-sanjana06 > personal notes are managed only in watchlist-->
    <div v-if="variant === 'watchlist'" class="space-y-2">
      <p v-if="comment" class="line-clamp-2 text-sm text-muted-foreground">
        Note: {{ comment }}
      </p>

      <p v-else class="text-sm italic text-muted-foreground">
        No personal note added.
      </p>

      <Button type="button" variant="outline" size="sm" class="w-full" @click.stop="emit('edit')">
        {{ comment ? 'Edit Note' : 'Add Note' }}
      </Button>
    </div>

  </article>
</template>
