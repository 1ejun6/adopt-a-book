
<script setup>
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { HugeiconsIcon } from '@hugeicons/vue';
import {
  Bookmark02Icon,
  BookmarkCheck02Icon,
  Delete02Icon
} from '@hugeicons/core-free-icons';

//@sree-sanjana06 > reuse card for browse books and watchlist
defineProps({
  book: { type: Object, required: true },
  variant: { type: String, default: 'browse' },
  saved: { type: Boolean, default: false },
  comment: { type: String, default: '' }
});

//@sree-sanjana06 > parent handles book preview and watchlist removal
const emit = defineEmits(['preview', 'remove']);

//@sree-sanjana06 > convert author array into readable text
function getAuthors(book) {
  return Array.isArray(book.authors) && book.authors.length
    ? book.authors.join(', ') : 'Unknown author';
}
</script>

<template>
  <article class="flex h-full flex-col gap-5 rounded-xl border bg-card p-5">

    <!--@sree-sanjana06 > shared book cover, title and author-->
    <div class="flex min-h-44 items-start gap-3">
      <div class="min-w-0 flex-1">
        <AppBookIdentity
          :title="book.title"
          :author="getAuthors(book)"
          :cover="book.coverurl"
          coverClass="w-24"
        />
      </div>

      <!--@sree-sanjana06 > bookmark icon for browse books-->
      <button v-if="variant === 'browse'"
        type="button"
        class="shrink-0 rounded-lg p-2 hover:bg-muted"
        :title="saved ? 'Saved to watchlist' : 'Save to watchlist'"
        :aria-label="saved ? 'View saved book' : 'View book to save'"
        @click="emit('preview', book)">
        <HugeiconsIcon
          :icon="saved ? BookmarkCheck02Icon : Bookmark02Icon"
          class="size-6"
          aria-hidden="true"
        />
      </button>

      <!--@sree-sanjana06 > remove saved book from watchlist-->
      <button v-if="variant === 'watchlist'"
        type="button"
        class="shrink-0 rounded-lg p-2 text-destructive hover:bg-muted"
        title="Remove from watchlist"
        aria-label="Remove from watchlist"
        @click="emit('remove')">
        <HugeiconsIcon
          :icon="Delete02Icon"
          class="size-6"
          aria-hidden="true"
        />
      </button>
    </div>

    <!--@sree-sanjana06 > shared subject display-->
    <div class="flex min-h-5 items-center gap-2.5">
      <span v-if="book.subjects?.length"
        class="text-xs text-muted-foreground">
        {{ book.subjects[0] }}
      </span>
    </div>

    <!--@sree-sanjana06 > consistent space for book description-->
    <div class="h-[3.75rem] overflow-hidden">
      <p v-if="book.description"
        class="line-clamp-3 text-sm text-muted-foreground">
        {{ book.description }}
      </p>
    </div>

    <!--@sree-sanjana06 > display saved comment on watchlist only-->
    <div v-if="variant === 'watchlist'" class="min-h-12">
      <p v-if="comment" class="line-clamp-2 text-sm text-muted-foreground">
        Note: {{ comment }}
      </p>
    </div>

    <!--@sree-sanjana06 > shared collection information-->
    <div class="mt-auto min-h-5">
      <p v-if="book.collectionarea"
        class="text-xs text-muted-foreground">
        Collection: {{ book.collectionarea }}
      </p>
    </div>

    <!--@sree-sanjana06 > open book details on either page-->
    <Button variant="outline" class="w-full"
      @click="emit('preview', book)">
      View book →
    </Button>

  </article>
</template>
