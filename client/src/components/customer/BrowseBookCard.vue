<script setup>
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';

//@sree-sanjana06 > receive one book and whether it is in the customer's watchlist
defineProps({
  book: { type: Object, required: true },
  saved: { type: Boolean, default: false }
});

//@sree-sanjana06 > parent handles opening book details
const emit = defineEmits(['preview']);

function getAuthors(book) { //!@1ejun6 > why is this here?
  return Array.isArray(book.authors) && book.authors.length
    ? book.authors.join(', ') : 'Unknown author';
}
</script>

<template>
  <article class="flex flex-col gap-5 rounded-xl border bg-card p-5">
    <!--@sree-sanjana06 > reuse existing cover, title and author component-->
    <AppBookIdentity :title="book.title" :author="getAuthors(book)" :cover="book.coverurl" coverClass="w-24" />

    <!--@sree-sanjana06 > display subject and current availability-->
    <div class="flex flex-wrap items-center gap-2.5">
      <AppStatusBadge v-if="book.status" :status="book.status" />
      <span v-if="book.subjects?.length" class="text-xs text-muted-foreground">
        {{ book.subjects[0] }}
      </span>
    </div>

    <!--@sree-sanjana06 > display short description and collection area when available-->
    <div class="flex-1 space-y-2">
      <p v-if="book.description" class="line-clamp-3 text-sm text-muted-foreground">
        {{ book.description }}
      </p>

      <p v-if="book.collectionarea" class="text-xs text-muted-foreground">
        Collection: {{ book.collectionarea }}
      </p>
    </div>

    <!--@sree-sanjana06 > saved status is based on the existing watchlist data-->
    <p v-if="saved" class="text-sm text-muted-foreground">
      Saved to your watchlist
    </p>

    <!--@sree-sanjana06 > open existing details popup to save or request a copy-->
    <Button variant="outline" class="w-full" @click="emit('preview', book)">
      View book →
    </Button>
  </article>
</template>
