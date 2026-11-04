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
    <DialogContent class="max-w-5xl">
      <DialogHeader>
        <DialogTitle class="text-3xl">Request a copy</DialogTitle>
        <DialogDescription>review the selected copy before submitting</DialogDescription>
      </DialogHeader>

      <div v-if="book" class="space-y-6 p-6">

        <!--@sree-sanjana06 > request progress tracker-->
        <div class="grid grid-cols-4 gap-2 sm:gap-4">
          <div class="space-y-2 border-t-2 border-green-700 pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-green-100 text-green-800">✓</span>
            <p class="text-sm sm:text-sm">choose a book</p>
          </div>
          <div class="space-y-2 border-t-2 border-foreground pt-3">
            <span class="grid size-9 place-items-center rounded-full bg-foreground text-background">2</span>
            <p class="text-sm sm:text-sm font-semibold">request &amp; review</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full">3</span>
            <p class="text-sm sm:text-sm">arrange pickup</p>
          </div>
          <div class="space-y-2 border-t-2 pt-3 text-muted-foreground">
            <span class="grid size-9 place-items-center rounded-full">4</span>
            <p class="text-sm sm:text-sm">collect your book</p>
          </div>
        </div>

        <p class="text-muted-foreground text-sm">you're sending a request, not booking a pickup nothing is
          submitted until you confirm below</p>

        <div class="grid gap-6 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <div class="space-y-3">
            <p class="text-muted-foreground text-sm">your selected copy</p>
            <AppBookIdentity :title="book.title" :author="props.book.authors?.join(', ') || 'author not listed'"
              :cover="book.coverurl" coverClass="w-32" />
          </div>

          <div class="space-y-5 rounded-xl border p-5">
            <h3 class="text-2xl">Requesting as</h3>

            <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
              <dt class="text-muted-foreground">Reader</dt>
              <dd class="break-words">{{ props.reader?.name || 'Reader' }}</dd>
              <dt class="text-muted-foreground">Email</dt>
              <dd class="break-all">{{ props.reader?.email || 'Not available' }}</dd>
            </dl>

            <div class="space-y-3 border-t pt-5">
              <h4 class="text-xl">The team reviews each request</h4>
              <p class="text-muted-foreground text-sm">you're asking for this donated copy, free of charge submitting doesn't
                reserve it if approved, you can arrange a pickup time</p>
              <p class="text-muted-foreground text-sm">you can follow the response in my adoptions</p>
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
