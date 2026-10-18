<script setup>
// guest browse page > preview only > requesting needs an account
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { mockbooks } from '@/data/mockbooks';
import { Button } from '@/components/ui/button';
import BookFilterBar from '@/components/books/BookFilterBar.vue';
import BookShelf from '@/components/books/BookShelf.vue';
import BookPreview from '@/components/books/BookPreview.vue';

const books = ref(mockbooks);
const search = ref('');
const genre = ref('All');
const nearMe = ref(false);
const locating = ref(false);
const position = ref(null);
const locationError = ref('');
const selected = ref(null);

const genres = computed(() => [...new Set(books.value.flatMap((book) => book.subjects))].sort());

// straight line km between two coordinates (haversine)
function distanceKm(from, to) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const a =
    Math.sin(rad(to.lat - from.lat) / 2) ** 2 +
    Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(rad(to.lng - from.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

const sortingByDistance = computed(() => nearMe.value && position.value);

function distanceTo(book) {
  return sortingByDistance.value && book.pickup ? distanceKm(position.value, book.pickup) : null;
}

const shown = computed(() => {
  const term = search.value.trim().toLowerCase();
  const list = books.value.filter((book) => {
    const matchesTerm =
      !term ||
      book.title.toLowerCase().includes(term) ||
      book.authors.some((author) => author.toLowerCase().includes(term));
    const matchesGenre = genre.value === 'All' || book.subjects.includes(genre.value);
    return matchesTerm && matchesGenre;
  });
  return sortingByDistance.value ? [...list].sort((a, b) => distanceTo(a) - distanceTo(b)) : list;
});

// ask the browser for location the first time near me is turned on
watch(nearMe, (on) => {
  locationError.value = '';
  if (!on || position.value) return;
  if (!navigator.geolocation) {
    locationError.value = 'Your browser cannot share location.';
    nearMe.value = false;
    return;
  }
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      position.value = { lat: coords.latitude, lng: coords.longitude };
      locating.value = false;
    },
    () => {
      locationError.value = 'Location permission was denied > showing all books.';
      nearMe.value = false;
      locating.value = false;
    },
  );
});

function toggle(book) {
  selected.value = selected.value?.id === book.id ? null : book;
}
</script>

<template>
  <div class="w-full">
    <div class="mx-auto max-w-6xl space-y-5">
      <header class="space-y-2">
        <h1 class="text-5xl">Browse books</h1>
        <p class="text-muted-foreground">
          Preview a donated book. Create an account only when you're ready to request it.
        </p>
      </header>

      <BookFilterBar
        v-model:search="search"
        v-model:genre="genre"
        v-model:near-me="nearMe"
        :genres="genres"
        :locating="locating"
      />

      <div class="flex items-end justify-between gap-3 border-b border-border pb-3">
        <h2>Available on the shelf</h2>
        <p class="text-right text-xs text-muted-foreground">
          {{ shown.length }} {{ shown.length === 1 ? 'book' : 'books' }}
          <template v-if="sortingByDistance">· nearest first</template> · tap a spine to preview
        </p>
      </div>
      <p v-if="locationError" role="alert" class="text-sm text-destructive">{{ locationError }}</p>

      <div class="space-y-8">
        <BookShelf :books="shown" :selected-id="selected?.id" @select="toggle">
          <!-- only show distance labels while near me is sorting the shelf -->
          <template v-if="sortingByDistance" #label="{ book, index }">
            <p v-if="index === 0" class="font-heading text-sm">Closest</p>
            <p v-else-if="index === shown.length - 1" class="font-heading text-sm">Furthest</p>
            <p v-if="book.pickup" class="text-muted-foreground">{{ distanceTo(book).toFixed(1) }} km</p>
          </template>
        </BookShelf>
        <BookPreview
          v-if="selected"
          :book="selected"
          :distance="distanceTo(selected)"
          class="mx-auto max-w-3xl"
          @close="selected = null"
        >
          <template #actions>
            <div class="space-y-2 border-t border-border pt-4">
              <p class="text-sm text-muted-foreground">Like this one? Make an account to request it.</p>
              <Button as-child class="w-full">
                <RouterLink to="/register">Create account to request</RouterLink>
              </Button>
              <RouterLink to="/login" class="block text-center text-sm underline">
                I already have an account
              </RouterLink>
            </div>
          </template>
        </BookPreview>
      </div>
    </div>
  </div>
</template>
