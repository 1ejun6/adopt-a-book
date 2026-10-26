<script setup>
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';

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
  <article class="flex h-full flex-col gap-5 rounded-xl border bg-card p-5">

    <!--@sree-sanjana06 > consistent space for book cover, title and author-->
    <div class="min-h-44">
      <AppBookIdentity
        :title="book.title"
        :author="getAuthors(book)"
        :cover="book.coverurl"
        coverClass="w-24"
      />
    </div>

    <!--@sree-sanjana06 > reserve space for book subject-->
    <div class="flex min-h-5 flex-wrap items-center gap-2.5">
      <span v-if="book.subjects?.length"
        class="text-xs text-muted-foreground">
        {{ book.subjects[0] }}
      </span>
    </div>

    <!--@sree-sanjana06 > reserve three lines for description on every card-->
    <div class="h-[3.75rem] overflow-hidden">
      <p v-if="book.description"
        class="line-clamp-3 text-sm text-muted-foreground">
        {{ book.description }}
      </p>
    </div>

    <!--@sree-sanjana06 > keep collection information aligned-->
    <div class="mt-auto min-h-5">
      <p v-if="book.collectionarea"
        class="text-xs text-muted-foreground">
        Collection: {{ book.collectionarea }}
      </p>
    </div>

    <!--@sree-sanjana06 > reserve equal space for saved status-->
    <p class="min-h-6 text-sm text-muted-foreground">
      {{ saved ? 'Saved to your watchlist' : '' }}
    </p>

    <!--@sree-sanjana06 > open existing book details popup-->
    <Button variant="outline" class="w-full"
      @click="emit('preview', book)">
      View book →
    </Button>

  </article>
</template>

