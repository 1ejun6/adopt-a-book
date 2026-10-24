
<script setup>
import { ref, computed, onMounted } from 'vue';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import FeaturedBookshelf from '@/components/customer/FeaturedBookshelf.vue';
import WatchlistCarousel from '@/components/customer/WatchlistCarousel.vue';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';

//@sree-sanjana06 > homepage holds shared API data; components handle their own UI
const books = ref([]);
const watchlist = ref([]);
const loading = ref(true);
const bookError = ref('');
const watchlistError = ref('');
const dialogs = ref(null);
const customerName = computed(() => auth.user?.name?.trim().split(' ')[0] || 'Reader');

//@sree-sanjana06 > load books and watchlist together 
async function loadHome() {
  loading.value = true;
  bookError.value = '';
  watchlistError.value = '';

  const results = await Promise.allSettled([
    api('/books', { query: { status: 'available', limit: 100 } }),
    api('/watchlist')
  ]);

  if (results[0].status === 'fulfilled') {
    //@sree-sanjana06 > BookSpine needs a nonempty authors array
    books.value = (results[0].value.books || []).map(book => ({
      ...book,
      authors: Array.isArray(book.authors) && book.authors.length
        ? book.authors : ['Unknown author']
    }));
  } else {
    books.value = [];
    bookError.value = 'Could not load available books.';
  }

  if (results[1].status === 'fulfilled') {
    watchlist.value = results[1].value.watchlist || [];
  } else {
    watchlist.value = [];
    watchlistError.value = 'Could not load your saved books.';
  }

  loading.value = false;
}

//@sree-sanjana06 > forward selected book to the dialog component
function openPreview(book) {
  dialogs.value?.openBookDetails(book);
}

//@sree-sanjana06 > update carousel after saving without reloading the whole page
function updateWatchlist(entries) {
  watchlist.value = entries;
}

onMounted(loadHome);
</script>

<template>
  <main class="mx-auto w-full max-w-7xl space-y-10">
    <!--@sree-sanjana06 > personalised welcome using logged-in customer name-->
    <header class="space-y-2 border-b pb-6">
      <p class="text-xs uppercase tracking-widest text-muted-foreground">Your reading corner</p>
      <h1 class="font-heading text-4xl">What will you read next?</h1>
      <p class="text-muted-foreground">Hi {{ customerName }}. Pick a book from the shelf.</p>
    </header>

    <!--@sree-sanjana06 > existing BookSpine is reused inside this section-->
    <FeaturedBookshelf
      :books="books" :loading="loading" :error="bookError"
      @retry="loadHome" @preview="openPreview"
    />

    <!--@sree-sanjana06 > carousel displays saved books and their optional comments-->
    <WatchlistCarousel
      :watchlist="watchlist" :loading="loading" :error="watchlistError"
      @retry="loadHome"
    />

    <!--@sree-sanjana06 > book details, save note and request review dialogs-->
    <CustomerBookDialogs
      ref="dialogs" :watchlist="watchlist"
      @saved="updateWatchlist"
    />
  </main>
</template>
