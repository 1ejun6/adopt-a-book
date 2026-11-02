<script setup>
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';
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
  <article v-if="loading" class="space-y-4 rounded-xl border p-5" role="status" aria-busy="true">
    <div class="space-y-2">
      <Skeleton class="ml-auto size-6" />
      <AppBookIdentity loading vertical coverClass="h-40 w-full" />
    </div>
    <Skeleton class="h-4 w-1/3" />
    <Skeleton class="h-4 w-2/3" />
  </article>

  <!--@sree-sanjana06 > allow cards to size naturally without unnecessary empty space-->
  <article v-else-if="book" class="washi-tape washi-tape-hover flex min-w-0 cursor-pointer flex-col gap-4 rounded-xl border p-5" role="button" tabindex="0" aria-haspopup="dialog" @click="emit('preview', book)" @keydown.enter.self.prevent="emit('preview', book)" @keydown.space.self.prevent="emit('preview', book)">
    <!--@sree-sanjana06 > shared book cover, title and author-->
    <div :class="variant === 'browse' ? 'flex flex-col gap-2' : 'flex items-start gap-3'">
      <AppBookIdentity :title="book.title" :author="getAuthors(book)" :cover="variant === 'browse' ? book.thumbnailurl || book.coverurl : book.coverurl" :coverClass="variant === 'browse' ? 'h-40 w-full' : 'w-24'" :wrap="variant === 'browse'" :vertical="variant === 'browse'" :class="variant === 'browse' ? 'order-2' : 'flex-1'" />

      <!--@sree-sanjana06 > save directly or request removal when already saved-->
      <button v-if="variant === 'browse'" type="button" class="self-end rounded-lg p-2" :disabled="busy" :title="saved ? 'Remove from watchlist' : 'Save to watchlist'" :aria-pressed="saved" @click.stop="emit(saved ? 'unsave' : 'save', book)">
        <HugeiconsIcon :icon="Bookmark02Icon" class="size-5" :class="{ 'fill-success-foreground text-success-foreground': saved }" aria-hidden="true" />
      </button>

      <!--@sree-sanjana06 > remove saved book from watchlist-->
      <button v-if="variant === 'watchlist'" type="button" class="shrink-0 rounded-lg p-2 text-destructive" title="Remove from watchlist" aria-haspopup="dialog" @click.stop="emit('remove')">
        <HugeiconsIcon :icon="Delete02Icon" class="size-6" aria-hidden="true" />
      </button>
    </div>

    <!--@1ejun6 > shared metadata styles > missing fields do not reserve empty rows -->
      <div class="mt-auto space-y-1 text-sm text-muted-foreground">
        <AppStatusBadge v-if="variant === 'watchlist' && book.status" :status="book.status" />
        <p v-if="book.subjects?.length">{{ book.subjects[0] }}</p>
        <p v-if="book.collectionarea || (variant === 'watchlist' && book.mrtstation?.name)">collection: {{ book.collectionarea || book.mrtstation?.name }}</p>
        <p v-if="variant === 'watchlist' && book.condition">condition: {{ book.condition }}</p>
      </div>

    <!--@sree-sanjana06 > personal notes are managed only in watchlist-->
    <div v-if="variant === 'watchlist'" class="space-y-2">
      <p v-if="comment" class="line-clamp-2 text-sm text-muted-foreground">
        note: {{ comment }}
      </p>

      <p v-else class="text-sm italic text-muted-foreground">
        no personal note added
      </p>

      <Button type="button" variant="outline" size="sm" class="w-full" aria-haspopup="dialog" @click.stop="emit('edit')">
        {{ comment ? 'Edit Note' : 'Add Note' }}
      </Button>
    </div>

  </article>
</template>
