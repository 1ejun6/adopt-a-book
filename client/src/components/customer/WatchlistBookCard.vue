
<script setup>
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';

//@sree-sanjana06 > receive one watchlist entry from Watchlist.vue
defineProps({
  entry: { type: Object, required: true }
});

//@sree-sanjana06 > tell parent which saved book to view, edit or remove
const emit = defineEmits(['preview', 'edit', 'remove']);

function getAuthors(book) {
  return Array.isArray(book?.authors) && book.authors.length
    ? book.authors.join(', ') : 'Unknown author';
}
</script>

<template>
  <article class="space-y-5 rounded-xl border bg-card p-5">
    <!--@sree-sanjana06 > show availability of the saved book-->
    <AppStatusBadge v-if="entry.bookid?.status"
      :status="entry.bookid.status" />

    <!--@sree-sanjana06 > reuse shared book cover, title and author display-->
    <AppBookIdentity v-if="entry.bookid"
      :title="entry.bookid.title"
      :author="getAuthors(entry.bookid)"
      :cover="entry.bookid.coverurl"
      coverClass="w-20" />

    <!--@sree-sanjana06 > show customer's private note if one exists-->
    <div v-if="entry.comments" class="rounded-lg bg-muted p-3">
      <p class="text-xs text-muted-foreground">Your note</p>
      <p class="mt-1 whitespace-pre-wrap text-sm">{{ entry.comments }}</p>
    </div>
    <p v-else class="text-sm text-muted-foreground">No note added yet.</p>

    <!--@sree-sanjana06 > parent handles all actions so this card has no API calls-->
    <div class="space-y-3 border-t pt-4">
      <Button variant="outline" class="w-full"
        :disabled="!entry.bookid"
        @click="emit('preview', entry.bookid)">
        View book →
      </Button>

      <div class="flex items-center justify-between gap-3">
        <Button variant="ghost" @click="emit('edit', entry)">
          Edit note
        </Button>
        <Button variant="ghost" @click="emit('remove', entry)">
          Remove
        </Button>
      </div>
    </div>
  </article>
</template>
