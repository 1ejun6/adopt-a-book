<script setup>
// details for the selected book > actions slot lets guest / customer / admin add their own buttons
import { Cancel01Icon, Location01Icon } from '@hugeicons/core-free-icons';

defineProps({
  book: { type: Object, required: true },
  distance: { type: Number, default: null },
});

const emit = defineEmits(['close']);
</script>

<template>
  <article class="carddupe relative bg-card">
    <button type="button" class="absolute top-3 right-3 rounded-md p-1 hover:bg-accent" aria-label="close preview" @click="emit('close')">
      <HugeiconsIcon :icon="Cancel01Icon" class="size-4" aria-hidden="true" />
    </button>
    <header class="space-y-1 pr-8">
      <h3>{{ book.title }}</h3>
      <p class="text-sm text-muted-foreground">{{ book.authors.join(', ') }} · {{ book.publicationyear }}</p>
    </header>
    <p>{{ book.description }}</p>
    <ul class="flex flex-wrap gap-2 text-xs">
      <li v-for="subject in book.subjects" :key="subject" class="rounded-full border border-border px-2 py-0.5">{{ subject }}</li>
      <li class="rounded-full border border-foreground bg-primary px-2 py-0.5">{{ book.status }}</li>
    </ul>
    <p v-if="book.pickup" class="flex items-center gap-1 text-sm text-muted-foreground">
      <HugeiconsIcon :icon="Location01Icon" class="size-4" aria-hidden="true" />
      Pickup at {{ book.pickup.area }}<template v-if="distance !== null"> · {{ distance.toFixed(1) }} km away</template>
    </p>
    <slot name="actions" :book="book" />
  </article>
</template>
