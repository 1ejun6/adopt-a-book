<script setup>
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const props = defineProps({
  book: { type: Object, default: null },
  reader: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  submitted: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
const open = defineModel('open', { type: Boolean, default: false });
//@1ejun6 > shared request dialog > caller supplies data & handles submission
const emit = defineEmits(['submit']);
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] max-w-5xl p-0">
      <DialogHeader class="border-b p-5 pr-20">
        <DialogTitle class="text-3xl">Request a copy</DialogTitle>
        <DialogDescription class="sr-only">{{ book?.title }}</DialogDescription>
      </DialogHeader>

      <div v-if="book" class="space-y-6 p-6">

        <!--@sree-sanjana06 > request progress tracker-->
        <div class="grid grid-cols-4 gap-2 sm:gap-4">
          <div class="space-y-2 border-t-2 border-green-700 pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-green-100 text-green-800">✓</span>
            <p class="text-xs sm:text-sm">Choose a book</p>
          </div>
          <div class="space-y-2 border-t-2 border-foreground pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-foreground text-background">2</span>
            <p class="text-xs sm:text-sm font-semibold">Request &amp; review</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full">3</span>
            <p class="text-xs sm:text-sm">Arrange pickup</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full">4</span>
            <p class="text-xs sm:text-sm">Collect your book</p>
          </div>
        </div>

        <p class="rounded-lg p-4 text-muted-foreground">You're sending a request, not booking a pickup. Nothing is
          submitted until you confirm below.</p>

        <div class="grid gap-6 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <div class="space-y-3">
            <p class="text-muted-foreground">Your selected copy</p>
            <AppBookIdentity :title="book.title" :author="props.book.authors?.join(', ') || 'author not listed'"
              :cover="book.coverurl" coverClass="w-32" />
          </div>

          <div class="space-y-5 rounded-xl border p-5">
            <h3 class="text-2xl">Requesting as</h3>

            <dl class="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
              <dt class="text-muted-foreground">Reader</dt>
              <dd class="break-words">{{ props.reader?.name || 'Reader' }}</dd>
              <dt class="text-muted-foreground">Email</dt>
              <dd class="break-all">{{ props.reader?.email || 'Not available' }}</dd>
            </dl>

            <div class="space-y-3 border-t pt-5">
              <h4 class="text-xl">The team reviews each request</h4>
              <p class="text-muted-foreground">You're asking for this donated copy, free of charge. Submitting doesn't
                reserve it. If approved, you can arrange a pickup time.</p>
              <p class="text-muted-foreground">You can follow the response in My Adoptions.</p>
            </div>


            <Button class="w-full" :disabled="loading || submitted || disabled" @click="emit('submit')">
              {{ submitted ? 'Request Submitted' : loading ? 'Submitting...' : 'Submit Request' }}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
