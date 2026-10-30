<script setup>
import { ref, watch } from 'vue';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import './CustomerBookDialogs.css';

//@sree-sanjana06 > receive selected book and popup state from CustomerBookDialogs.vue
const props = defineProps({
  book: { type: Object, default: null },
  open: { type: Boolean, default: false }
});

const emit = defineEmits(['update:open', 'submitted']);

//@sree-sanjana06 > request submission states are managed entirely in this component
const actionLoading = ref(false);
const actionMessage = ref('');
const actionError = ref('');
const requestSubmitted = ref(false);

function getAuthors(book) {
  return Array.isArray(book?.authors) && book.authors.length
    ? book.authors.join(', ')
    : 'Unknown author';
}

//@sree-sanjana06 > reset submission feedback when a different book is selected
watch(() => props.book?.id, () => {
  actionMessage.value = '';
  actionError.value = '';
  requestSubmitted.value = false;
});

//@sree-sanjana06 > submit adoption request using existing POST /applications
async function requestCopy() {
  if (!props.book || actionLoading.value || requestSubmitted.value) return;

  actionLoading.value = true;
  actionError.value = '';
  actionMessage.value = '';

  try {
    await api('/applications', { method: 'POST', body: { bookid: props.book.id } });
    requestSubmitted.value = true;
    actionMessage.value = 'Adoption request submitted successfully.';

    //@sree-sanjana06 > notify Book Details so Request Book becomes disabled
    emit('submitted');
  } catch (error) {
    actionError.value = error.message;
  } finally {
    actionLoading.value = false;
  }
}
</script>

<template>
  <!--@sree-sanjana06 > separate request confirmation and submission workflow-->
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto p-0" :showCloseButton="false">
      <DialogHeader class="flex flex-row items-center justify-between border-b p-5">
        <DialogTitle class="font-heading text-3xl">Request a copy</DialogTitle>
        <Button variant="outline" @click="emit('update:open', false)">Close</Button>
      </DialogHeader>

      <div v-if="book" class="space-y-6 p-6">
    
        <!--@sree-sanjana06 > progress tracker -->
        <div class="grid grid-cols-4 gap-2 sm:gap-4">
          <div class="space-y-2 border-t-2 border-green-700 pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-green-100 text-green-800">✓</span>
            <p class="book-dialog__progress-text">Choose a book</p>
          </div>
          <div class="space-y-2 border-t-2 border-foreground pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-foreground text-background">2</span>
            <p class="book-dialog__progress-text font-semibold">Request &amp; review</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full bg-muted">3</span>
            <p class="book-dialog__progress-text">Arrange pickup</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full bg-muted">4</span>
            <p class="book-dialog__progress-text">Collect your book</p>
          </div>
        </div>
        <p class="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          You're sending a request, not booking a pickup. Nothing is submitted until you confirm below.
        </p>

        <div class="grid gap-6 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <!-- selected book -->
          <div class="space-y-3">
            <p class="book-dialog__small-muted">Your selected copy</p>
            <AppBookIdentity :title="book.title" :author="getAuthors(book)" :cover="book.coverurl" coverClass="w-32" />
          </div>
          <div class="space-y-5 rounded-xl border p-5">
            <h3 class="font-heading text-2xl">Requesting as</h3>

            <!--@sree-sanjana06 > logged-in customer information-->
            <dl class="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
              <dt class="book-dialog__muted">Reader</dt>
              <dd class="break-words">{{ auth.user?.name || 'Reader' }}</dd>
              <dt class="book-dialog__muted">Email</dt>
              <dd class="break-all">{{ auth.user?.email || 'Not available' }}</dd>
            </dl>

            <!--@sree-sanjana06 > adoption review explanation-->
            <div class="space-y-3 border-t pt-5">
              <h4 class="font-heading text-xl">The team reviews each request</h4>
              <p class="book-dialog__small-muted">
                You're asking for this donated copy, free of charge. Submitting doesn't reserve it.
                If your request is approved, you can arrange a pickup time.
              </p>
              <p class="book-dialog__small-muted">You can follow the response in My Adoptions.</p>
            </div>

            <!-- ==================== SUBMISSION FEEDBACK ==================== -->
            <p v-if="actionMessage" class="book-dialog__success" role="status">{{ actionMessage }}</p>
            <p v-if="actionError" class="book-dialog__error" role="alert">{{ actionError }}</p>

            <!--@sree-sanjana06 > submit adoption request-->
            <Button class="w-full" :disabled="actionLoading || requestSubmitted" @click="requestCopy">
              {{ requestSubmitted ? 'Request submitted' : actionLoading ? 'Submitting...' : 'Submit request' }}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
