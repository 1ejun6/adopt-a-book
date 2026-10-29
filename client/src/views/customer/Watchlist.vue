<script setup>
import { ref, onMounted } from 'vue';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';
import CustomerBookCard from '@/components/customer/CustomerBookCard.vue';

const watchlist = ref([]);
const loading = ref(true);
const error = ref('');
const actionError = ref('');
const busy = ref(false);
const dialogs = ref(null);
const editingEntry = ref(null);
const removingEntry = ref(null);
const editOpen = ref(false);
const removeOpen = ref(false);
const note = ref('');

//@sree-sanjana06 > load saved books belonging to logged-in customer
async function loadWatchlist() {
  loading.value = true;
  error.value = '';
  try {
    const result = await api('/watchlist');
    watchlist.value = result.watchlist || [];
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

//@sree-sanjana06 > reuse existing Book Details popup
function openPreview(book) {
  dialogs.value?.openBookDetails(book);
}
//@sree-sanjana06 > open edit popup with existing private note
function startEdit(entry) {
  editingEntry.value = entry;
  note.value = entry.comments || '';
  actionError.value = '';
  editOpen.value = true;
}
//@sree-sanjana06 > update only the note on this watchlist entry
async function saveNote() {
  if (!editingEntry.value || busy.value || note.value.length > 300) return;
  busy.value = true;
  actionError.value = '';

  try {
    const id = editingEntry.value.id;
    const comments = note.value.trim();

    await api(`/watchlist/${id}`, {
      method: 'PATCH', //@sree-sanjana06 > partial
      body: { comments }
    });

    //@sree-sanjana06 > update displayed note without reloading the page
    watchlist.value = watchlist.value.map(entry =>
      entry.id === id ? { ...entry, comments } : entry
    );
    editOpen.value = false;
  } catch (err) {
    actionError.value = err.message;
  } finally {
    busy.value = false;
  }
}

//@sree-sanjana06 > ask for confirmation before deleting saved entry
function startRemove(entry) {
  removingEntry.value = entry;
  actionError.value = '';
  removeOpen.value = true;
}

//@sree-sanjana06 > delete entry from backend and update page immediately
async function removeBook() {
  if (!removingEntry.value || busy.value) return;
  busy.value = true;
  actionError.value = '';

  try {
    const id = removingEntry.value.id;
    await api(`/watchlist/${id}`, { method: 'DELETE' });

    watchlist.value = watchlist.value.filter(entry => entry.id !== id);
    removeOpen.value = false;
  } catch (err) {
    actionError.value = err.message;
  } finally {
    busy.value = false;
  }
}

onMounted(loadWatchlist);
</script>

<template>
  <main class="mx-auto w-full max-w-7xl space-y-8">
    <!--@sree-sanjana06 > watchlist heading and total saved books-->
    <header class="space-y-2 border-b pb-6">
      <p class="text-xs uppercase tracking-widest text-muted-foreground">Your reading corner</p>
      <h1 class="font-heading text-4xl">My Watchlist</h1>
      <p class="text-muted-foreground">Your saved books and private notes. Saving doesn't reserve a copy.</p>
      <p v-if="!loading && !error" class="text-sm text-muted-foreground">
        {{ watchlist.length }} saved books
      </p>
    </header>

    <p v-if="loading" class="text-muted-foreground">Loading your saved books...</p>

    <div v-else-if="error" class="space-y-3">
      <p class="text-destructive">{{ error }}</p>
      <Button variant="outline" @click="loadWatchlist">Try Again</Button>
    </div>

    <!--@sree-sanjana06 > show empty state after removing the final saved book-->
    <div v-else-if="watchlist.length === 0" class="rounded-xl border bg-card p-8 text-center">
      <h2 class="font-heading text-2xl">Your shelf is waiting</h2>
      <p class="mt-2 text-sm text-muted-foreground">
        Save a book while browsing to find it here later.
      </p>
    </div>

    <!--@sree-sanjana06 > each card emits actions handled by this page-->
    <section v-else class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
    
<!--@sree-sanjana06 > display saved books using shared customer card-->
  <CustomerBookCard v-for="entry in watchlist"  :key="entry.id" :book="entry.bookid" variant="watchlist" :comment="entry.comments || ''"
       @preview="openPreview" @remove="startRemove(entry)" />

</section>
    <!--@sree-sanjana06 > existing book details and adoption request popups-->
    <CustomerBookDialogs ref="dialogs" :watchlist="watchlist" manageWatchlist @saved="watchlist = $event"
      @edit="startEdit" />

    <!--@sree-sanjana06 > edit the saved note using existing Dialog UI-->
    <Dialog v-model:open="editOpen">
      <DialogContent class="max-w-xl">
        <DialogHeader>
          <DialogTitle class="font-heading text-3xl">Edit saved book</DialogTitle>
        </DialogHeader>

        <div class="space-y-4">
          <p class="text-muted-foreground">
            {{ editingEntry?.bookid?.title }}
          </p>

          <div class="space-y-2">
            <label for="edit-watchlist-note">Your note (optional)</label>
            <textarea id="edit-watchlist-note" v-model="note" maxlength="300" rows="4" :disabled="busy"
              class="w-full rounded-lg border bg-background p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"></textarea>
            <p class="text-sm text-muted-foreground">
              Only visible to you · {{ note.length }}/300 characters
            </p>
          </div>

          <p v-if="actionError" class="text-sm text-destructive" role="alert">{{ actionError }}</p>

          <div class="flex justify-end gap-3">
            <Button variant="outline" :disabled="busy" @click="editOpen = false">Cancel</Button>
            <Button :disabled="busy" @click="saveNote">
              {{ busy ? 'Saving...' : 'Save changes' }}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!--@sree-sanjana06 > confirm removal before deleting from backend-->
    <Dialog v-model:open="removeOpen">
      <DialogContent class="max-w-lg">
        <DialogHeader>
          <DialogTitle class="font-heading text-3xl">Remove from watchlist?</DialogTitle>
        </DialogHeader>

        <div class="space-y-5">
          <p class="text-muted-foreground">
            Remove {{ removingEntry?.bookid?.title }} from your saved books?
            You can save it again later if it is available.
          </p>

          <p v-if="actionError" class="text-sm text-destructive" role="alert">{{ actionError }}</p>

          <div class="flex justify-end gap-3">
            <Button variant="outline" :disabled="busy" @click="removeOpen = false">Cancel</Button>
            <Button :disabled="busy" @click="removeBook">
              {{ busy ? 'Removing...' : 'Remove book' }}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </main>
</template>
