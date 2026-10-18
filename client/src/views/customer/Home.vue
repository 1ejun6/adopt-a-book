
<script setup>
import { ref, computed, onMounted } from 'vue';

import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import BookSpine from '@/components/books/BookSpine.vue';

import { Badge } from '@/components/ui/badge';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

// DATA FROM EXISTING BACKEND
const books = ref([]);
const watchlist = ref([]);

const loading = ref(true);
const bookError = ref('');
const watchlistError = ref('');

// BOOKSHELF
const featuredBooks = ref([]);
// Small preview card
const pinnedBook = ref(null);

// Full book details popup
const dialogOpen = ref(false);
const dialogBook = ref(null);
const detailsLoading = ref(false);
const detailsError = ref('');

// Existing backend actions
const actionLoading = ref(false);
const actionMessage = ref('');
const actionError = ref('');
const requestSubmitted = ref(false);

const alreadySaved = computed(() => {
  return watchlist.value.some(
    entry => entry.bookid?.id === dialogBook.value?.id
  );
});




// Clicking a book spine keeps its preview visible
function toggleSpine(book) {
  pinnedBook.value =
    pinnedBook.value?.id === book.id ? null : book;
}

// Open the existing book details dialog
async function openBookDetails(book) {
  dialogBook.value = book;
  dialogOpen.value = true;
  detailsLoading.value = true;
  detailsError.value = '';
  actionMessage.value = '';
  actionError.value = '';
  requestSubmitted.value = false;

  try {
    // Existing GET /books/:id
    const result = await api(`/books/${book.id}`);
    dialogBook.value = result.book;
  } catch (error) {
    detailsError.value = error.message;
  } finally {
    detailsLoading.value = false;
  }
}

// Save using the existing watchlist endpoint
async function saveToWatchlist() {
  if (!dialogBook.value || actionLoading.value) return;

  actionLoading.value = true;
  actionError.value = '';
  actionMessage.value = '';

  try {
    await api('/watchlist', {
      method: 'POST',
      body: {
        bookid: dialogBook.value.id
      }
    });

    // Refresh the existing Saved for Later section
    const result = await api('/watchlist');
    watchlist.value = result.watchlist || [];

    actionMessage.value = 'Book saved to your watchlist.';
  } catch (error) {
    actionError.value = error.message;
  } finally {
    actionLoading.value = false;
  }
}

// Submit using the existing adoption application endpoint
async function requestCopy() {
  if (!dialogBook.value || actionLoading.value || requestSubmitted.value) {
    return;
  }

  // Confirm before creating a real adoption request
  const confirmed = window.confirm(
    `Submit an adoption request for "${dialogBook.value.title}"?`
  );

  if (!confirmed) return;

  actionLoading.value = true;
  actionError.value = '';
  actionMessage.value = '';

  try {
    await api('/applications', {
      method: 'POST',
      body: {
        bookid: dialogBook.value.id
      }
    });

    requestSubmitted.value = true;
    actionMessage.value = 'Adoption request submitted successfully.';
  } catch (error) {
    actionError.value = error.message;
  } finally {
    actionLoading.value = false;
  }
}

// WATCHLIST CAROUSEL
const watchlistTrack = ref(null);

// CUSTOMER NAME
const customerName = computed(() => {
  return auth.user?.name?.trim().split(' ')[0] || 'Reader';
});

// GET AUTHOR NAME FROM EXISTING AUTHORS ARRAY
function getAuthors(book) {
  if (!Array.isArray(book?.authors) || book.authors.length === 0) {
    return 'Unknown author';
  }

  return book.authors.join(', ');
}

// CHOOSE FIVE RANDOM AVAILABLE BOOKS
function randomiseBooks() {
  const shuffled = [...books.value];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [
      shuffled[j],
      shuffled[i]
    ];
  }

  featuredBooks.value = shuffled.slice(0, 5);
}



// SCROLL THE SAVED BOOKS CAROUSEL
function scrollWatchlist(direction) {
  watchlistTrack.value?.scrollBy({
    left: direction * 280,
    behavior: 'smooth'
  });
}

// LOAD DATA USING EXISTING API ENDPOINTS
async function loadHome() {
  loading.value = true;
  bookError.value = '';
  watchlistError.value = '';

  const results = await Promise.allSettled([
    api('/books', {
      query: {
        status: 'available',
        limit: 100
      }
    }),
    api('/watchlist')
  ]);

  // AVAILABLE BOOKS
  if (results[0].status === 'fulfilled') {
    const returnedBooks = results[0].value.books || [];

    // BookSpine expects authors[0] to exist.
    // This is a display fallback, not a database change.
    books.value = returnedBooks.map(book => ({
      ...book,
      authors:
        Array.isArray(book.authors) && book.authors.length
          ? book.authors
          : ['Unknown author']
    }));

    randomiseBooks();
  } else {
    books.value = [];
    featuredBooks.value = [];
    bookError.value = 'Could not load available books.';
  }

  // SAVED BOOKS
  if (results[1].status === 'fulfilled') {
    watchlist.value = results[1].value.watchlist || [];
  } else {
    watchlist.value = [];
    watchlistError.value = 'Could not load your saved books.';
  }

  loading.value = false;
}

onMounted(loadHome);
</script>

<template>
  <main class="mx-auto w-full max-w-7xl space-y-10">

    <!-- SECTION 1: WELCOME -->
    <header class="space-y-2 border-b pb-6">

      <p class="text-xs uppercase tracking-widest text-muted-foreground">
        Your reading corner
      </p>

      <h1 class="font-heading text-4xl">
        What will you read next?
      </h1>

      <p class="text-muted-foreground">
        Hi {{ customerName }}. Pick a book from the shelf.
      </p>

    </header>

    <!-- SECTION 2: DISCOVER YOUR NEXT READ -->
    <section class="space-y-5 rounded-xl border bg-card p-6">

      <!-- HEADING AND RANDOM BUTTON -->
      <div class="flex flex-wrap items-center justify-between gap-4">

        <div class="space-y-1">
          <h2 class="font-heading text-3xl">
            Discover Your Next Read
          </h2>

          <p class="text-sm text-muted-foreground">
            Five books looking for a new home.
          </p>
        </div>

        <Button
          variant="outline"
          :disabled="loading || books.length < 2"
          @click="randomiseBooks"
        >
          Random
        </Button>

      </div>

      <!-- LOADING -->
      <p
        v-if="loading"
        class="py-10 text-center text-muted-foreground"
      >
        Loading available books...
      </p>

      <!-- ERROR -->
      <div
        v-else-if="bookError"
        class="space-y-3 py-6 text-center"
      >
        <p class="text-muted-foreground">
          {{ bookError }}
        </p>

        <Button variant="outline" @click="loadHome">
          Try Again
        </Button>
      </div>

      <!-- EMPTY BOOKSHELF -->
      <p
        v-else-if="featuredBooks.length === 0"
        class="py-10 text-center text-muted-foreground"
      >
        There are no available books at the moment.
      </p>

      

<!-- INTERACTIVE BOOKSHELF -->
<div v-else>

  <div
    class="flex min-h-[23rem] items-end justify-center gap-2 px-3 pt-10 sm:gap-3"
    aria-label="Available books"
  >

    <div
      v-for="(book, index) in featuredBooks"
      :key="book.id"
      class="group relative flex shrink-0 items-end hover:z-40 focus-within:z-40"
      @mouseleave="pinnedBook = null"
    >

      <!-- EXISTING BOOKSPINE -->
      <BookSpine
        :book="book"
        :index="index"
        @select="toggleSpine"
      />

      <!-- HOVER OR CLICK PREVIEW -->
      <div
        class="absolute bottom-full left-1/2 z-30 w-72 -translate-x-1/2 pb-2"
        :class="
          pinnedBook?.id === book.id
            ? 'block'
            : 'hidden group-hover:block group-focus-within:block'
        "
      >

        <div class="space-y-3 rounded-xl border bg-card p-4 shadow-xl">

          <p class="text-sm text-muted-foreground">
            From our shelves
          </p>

          <AppBookIdentity
            :title="book.title"
            :author="getAuthors(book)"
            :cover="book.coverurl"
            coverClass="w-20"
          />

          <p
            v-if="book.description"
            class="line-clamp-2 text-sm text-muted-foreground"
          >
            {{ book.description }}
          </p>

          <!-- CLICK TO OPEN FULL BOOK DETAILS -->
          <div class="border-t pt-3">

            <Button
              variant="outline"
              class="w-full"
              @click.stop="openBookDetails(book)"
            >
              Click to preview
            </Button>

          </div>

        </div>

      </div>

    </div>

  </div>

  <!-- SHELF BASE -->
  <div class="h-3 rounded-md bg-foreground"></div>

  <p class="mt-3 text-center text-sm text-muted-foreground">
    Showing {{ featuredBooks.length }} available
    {{ featuredBooks.length === 1 ? 'book' : 'books' }}.
    Hover over a book to preview it.
  </p>

</div>
</section>


    <!-- SECTION 3: SAVED FOR LATER -->
    <section class="space-y-5">

      <div class="flex flex-wrap items-center justify-between gap-4">

        <div class="space-y-1">
          <h2 class="font-heading text-3xl">
            Saved for Later
          </h2>

          <p class="text-sm text-muted-foreground">
            The books you want to come back to.
          </p>
        </div>

        <!-- CAROUSEL CONTROLS -->
        <div
          v-if="watchlist.length > 0"
          class="flex items-center gap-2"
        >
          <Button
            variant="outline"
            size="sm"
            aria-label="Previous saved books"
            @click="scrollWatchlist(-1)"
          >
            ←
          </Button>

          <Button
            variant="outline"
            size="sm"
            aria-label="Next saved books"
            @click="scrollWatchlist(1)"
          >
            →
          </Button>
        </div>

      </div>

      <!-- LOADING -->
      <p v-if="loading" class="text-muted-foreground">
        Loading your saved books...
      </p>

      <!-- ERROR -->
      <div v-else-if="watchlistError" class="space-y-3">
        <p class="text-muted-foreground">
          {{ watchlistError }}
        </p>

        <Button variant="outline" @click="loadHome">
          Try Again
        </Button>
      </div>

      <!-- EMPTY WATCHLIST -->
      <div
        v-else-if="watchlist.length === 0"
        class="rounded-xl border bg-card p-8 text-center"
      >
        <h3 class="font-heading text-xl">
          Nothing saved just yet
        </h3>

        <p class="mt-2 text-sm text-muted-foreground">
          Books you save to your watchlist will appear here.
        </p>
      </div>

      <!-- SAVED BOOKS CAROUSEL -->
      <div
        v-else
        ref="watchlistTrack"
        class="flex gap-4 overflow-x-auto pb-4"
        aria-label="Saved books"
      >

        <article
          v-for="entry in watchlist"
          :key="entry.id"
          class="w-64 shrink-0 space-y-3 rounded-xl border bg-card p-4"
        >

          <!-- BACKEND RETURNS BOOKID AS A BOOK OBJECT -->
          <AppBookIdentity
            v-if="entry.bookid"
            :title="entry.bookid.title"
            :author="getAuthors(entry.bookid)"
            :cover="entry.bookid.coverurl"
          />

          <!-- EXISTING WATCHLIST COMMENTS -->
          <p
            v-if="entry.comments"
            class="text-sm text-muted-foreground"
          >
            {{ entry.comments }}
          </p>

          <!-- EXISTING BOOK STATUS -->
          <p
            v-if="entry.bookid?.status"
            class="text-xs capitalize text-muted-foreground"
          >
            {{ entry.bookid.status }}
          </p>

        </article>

      </div>

    </section>



    
<!-- FULL BOOK DETAILS POPUP -->
<Dialog v-model:open="dialogOpen">

  <DialogContent
    class="w-[calc(100vw-2rem)] max-w-4xl p-0"
    :showCloseButton="false"
  >

    <!-- POPUP HEADER -->
    <DialogHeader class="flex flex-row items-center justify-between border-b p-5">

      <DialogTitle class="font-heading text-3xl">
        Book details
      </DialogTitle>

      <Button
        variant="outline"
        @click="dialogOpen = false"
      >
        Close
      </Button>

    </DialogHeader>

    <div v-if="dialogBook" class="space-y-6 p-6">

      <p v-if="detailsLoading" class="text-muted-foreground">
        Loading book details...
      </p>

      <p v-if="detailsError" class="text-sm text-destructive">
        {{ detailsError }}
      </p>

      <!-- BOOK INFORMATION -->
      <div class="space-y-5">

        <AppBookIdentity
          :title="dialogBook.title"
          :author="getAuthors(dialogBook)"
          :cover="dialogBook.coverurl"
          coverClass="w-32"
        />

        <Badge
          :variant="dialogBook.status === 'available' ? 'green' : 'amber'"
        >
          {{ dialogBook.status }}
        </Badge>

        <!-- DESCRIPTION -->
        <p
          v-if="dialogBook.description"
          class="text-muted-foreground"
        >
          {{ dialogBook.description }}
        </p>

        <!-- BOOK METADATA -->
        <dl class="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-3">

          <template v-if="dialogBook.subjects?.length">
            <dt class="text-muted-foreground">Subjects</dt>
            <dd>{{ dialogBook.subjects.join(', ') }}</dd>
          </template>

          <template v-if="dialogBook.publicationyear">
            <dt class="text-muted-foreground">Published</dt>
            <dd>{{ dialogBook.publicationyear }}</dd>
          </template>

          <template v-if="dialogBook.isbn">
            <dt class="text-muted-foreground">ISBN</dt>
            <dd>{{ dialogBook.isbn }}</dd>
          </template>

          <template v-if="dialogBook.condition">
            <dt class="text-muted-foreground">Condition</dt>
            <dd class="capitalize">{{ dialogBook.condition }}</dd>
          </template>

          <template v-if="dialogBook.collectionarea">
            <dt class="text-muted-foreground">Collection</dt>
            <dd>{{ dialogBook.collectionarea }}</dd>
          </template>

        </dl>

      </div>

      <!-- ADOPTION INFORMATION -->
      <div class="space-y-4 border-t pt-5">

        <h3 class="font-heading text-xl">
          A book, not a checkout.
        </h3>

        <p class="text-muted-foreground">
          Request this donated copy for free.
          The team reviews your request before
          you arrange collection.
        </p>

        <!-- BACKEND FEEDBACK -->
        <p
          v-if="actionMessage"
          class="rounded-lg bg-success p-3 text-sm"
          role="status"
        >
          {{ actionMessage }}
        </p>

        <p
          v-if="actionError"
          class="text-sm text-destructive"
          role="alert"
        >
          {{ actionError }}
        </p>

        <!-- EXISTING BACKEND ACTIONS -->
        <div class="grid gap-3 sm:grid-cols-2">

          <Button
            :disabled="
              actionLoading ||
              detailsLoading ||
              dialogBook.status !== 'available' ||
              requestSubmitted
            "
            @click="requestCopy"
          >
            {{ requestSubmitted ? 'Request submitted' : 'Request copy' }}
          </Button>

          <Button
            variant="outline"
            :disabled="
              actionLoading ||
              detailsLoading ||
              dialogBook.status !== 'available' ||
              alreadySaved
            "
            @click="saveToWatchlist"
          >
            {{ alreadySaved ? 'Already saved' : 'Save to watchlist' }}
          </Button>

        </div>

      </div>

    </div>

  </DialogContent>

</Dialog>


  </main>
</template>
