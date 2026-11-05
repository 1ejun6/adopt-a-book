<script setup>
import { computed, ref, useId, watch } from 'vue';
import { useWatchlistStore } from '@/stores/watchlist';
const store = useWatchlistStore();
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const props = defineProps({
  entry: { type: Object, default: null },
  action: { type: String, default: 'edit', validator: value => ['edit', 'remove'].includes(value) },
});
const open = defineModel('open', { type: Boolean, default: false });
const emit = defineEmits(['saved', 'removed']);
const editing = computed(() => props.action === 'edit');
const noteId = useId();
const note = ref('');
const busy = ref(false);
const error = ref('');

watch(open, value => {
  if (!value) return;
  note.value = props.entry?.comments || '';
  error.value = '';
});

//@sree-sanjana06 > update only the note on this watchlist entry
async function submit() {
  if (!props.entry || busy.value || (editing.value && note.value.length > 300)) return;
  const id = props.entry.id;
  const comments = note.value.trim();
  const edit = editing.value;
  busy.value = true;
  error.value = '';
  try {
    //@sree-sanjana06 > delete entry from backend and update page immediately
    if (edit) await store.updateComment(id, comments);
    else await store.removeEntry(id);
    if (edit) emit('saved', { id, comments });
    else emit('removed', id);
    open.value = false;
  } catch (failure) {
    error.value = failure.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="value => { if (!busy) open = value; }">
    <DialogContent class="max-w-lg border" :showCloseButton="!busy">
      <DialogHeader>
        <DialogTitle>{{ editing ? 'Edit your note' : 'Remove from watchlist?' }}</DialogTitle>
        <DialogDescription>{{ editing ? 'keep a private reminder about this book' : 'remove this saved book from your watchlist' }}</DialogDescription>
      </DialogHeader>
      <form class="dialog-body" :aria-busy="busy" @submit.prevent="submit">
        <!--@sree-sanjana06 > edit the saved note using existing Dialog UI-->
        <template v-if="editing">
          <p class="text-muted-foreground text-sm">{{ entry?.bookid?.title || entry?.bookname }}</p>
          <div class="space-y-2 rounded-lg border bg-card p-4" data-active>
            <label :for="noteId">Your note (optional)</label>
            <textarea :id="noteId" v-model="note" maxlength="300" rows="4" :disabled="busy"
              class="w-full rounded-lg border p-3"></textarea>
            <p class="text-muted-foreground text-sm">only visible to you · {{ note.length }}/300 characters</p>
          </div>
        </template>
        <!--@sree-sanjana06 > confirm removal before deleting from backend-->
        <p v-else class="text-muted-foreground text-sm">
          remove {{ entry?.bookid?.title || entry?.bookname }} from your saved books?
          you can save it again later if it is available
        </p>
        <p v-if="error" class="text-destructive text-sm" role="alert">{{ error }}</p>
        <DialogFooter class="justify-end">
          <Button type="button" variant="outline" :disabled="busy" @click="open = false">Cancel</Button>
          <Button type="submit" :variant="editing ? 'default' : 'destructive'" :disabled="busy">
            {{ editing ? (busy ? 'Saving...' : 'Save changes') : (busy ? 'Removing...' : 'Remove book') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
