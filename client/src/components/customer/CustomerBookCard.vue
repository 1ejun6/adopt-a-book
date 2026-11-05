<script setup>
import CustomerBookAvailability from '@/components/customer/CustomerBookAvailability.vue';
import AppIcon from '@/components/shared/AppIcon.vue';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
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
  saving: { type: Boolean, default: false },
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
      <AppBookIdentity loading vertical coverClass="h-40 w-full" />
    </div>
    <Skeleton class="h-4 w-2/3" />
  </article>

  <article v-else-if="book" class="flex h-full min-w-0 flex-col gap-3 rounded-xl border bg-transparent p-4 hover:bg-primary focus-within:bg-primary data-[active]:bg-primary">
        <div class="flex items-center gap-2">
          <p v-if="book.subjects?.length" class="truncate text-sm text-muted-foreground" :title="book.subjects[0]">{{ book.subjects[0] }}</p>
          <Button variant="outline" type="button" class="ml-auto border-0 bg-transparent min-h-11 min-w-11 shrink-0 rounded-lg p-2" :class="{ 'text-destructive': variant === 'watchlist' }"
            :disabled="busy" :loading="saving" :aria-label="`${variant === 'watchlist' || saved ? 'Remove' : 'Save'} ${book.title} ${variant === 'watchlist' || saved ? 'from' : 'to'} saved books`"
            :aria-pressed="variant === 'browse' ? saved : undefined"
            @click.stop="handleAction(book)">
            <HugeiconsIcon v-if="variant === 'watchlist'" :icon="Delete02Icon" class="size-5" aria-hidden="true" />
            <HugeiconsIcon v-else :icon="Bookmark02Icon" class="size-5" :class="{ 'fill-success-foreground text-success-foreground': saved }" aria-hidden="true" />
          </Button>
        </div>
        <button
          class="preview"
          type="button"
          aria-haspopup="dialog"
          :aria-label="`View details for ${book.title}`"
          @click="$emit('preview', book)"
        >
          <AppBookIdentity
            :title="book.title"
            :author="getAuthors(book)"
            :cover="book.thumbnailurl || book.coverurl"
            cover-class="h-40 w-full"
            vertical
            wrap
          />
          <span class="metadata">
            <span class="collection flex min-w-0 items-center gap-2" :title="book.collectionarea || book.mrtstation?.name || 'Not provided'">
              <AppIcon name="location" :size="14" /><span class="sr-only">Collection:</span>
              <span class="min-w-0 flex-1 truncate">{{ book.collectionarea || book.mrtstation?.name || 'Not provided' }}</span>
              <CustomerBookAvailability v-if="variant === 'watchlist'" dot :status="book.status" :requestId="requestId" />
            </span>
          </span>
        </button>

  </article>
</template>

<style scoped>
.preview {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
}
.metadata {
  margin-top: auto;
  display: grid;
  gap: 0.625rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
  width: 100%;
  font-size: 0.875rem;
}
.collection {
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
