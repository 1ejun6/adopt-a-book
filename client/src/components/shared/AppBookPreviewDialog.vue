<script setup>
import { computed } from 'vue';
import { Bookmark02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/vue';
import { Skeleton } from '@/components/ui/skeleton';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

//@1ejun6 > shelf & customer pages share details layout > caller owns requests & saved state
const props = defineProps({
  book: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  saved: { type: Boolean, default: false },
  canSave: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
});
const open = defineModel('open', { type: Boolean, default: false });
const emit = defineEmits(['save', 'retry', 'close-auto-focus']);

function cleanDescription(description) {
  if (typeof description !== 'string') return '';

  return description
    .split(/\(?\[source\](?:\[\d+\])?\)?/i)[0]
    .split(/\n\s*(?:Preceded by:|Followed by:|Contains:|-{4,}|\[\d+\]:\s*https?:\/\/)/i)[0]
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

const description = computed(() => cleanDescription(props.book?.description));
const fields = computed(() => [
  { label: 'subject', value: props.book?.subjects?.join(', ') },
  { label: 'published', value: props.book?.publicationyear },
  { label: 'ISBN', value: props.book?.isbn },
  { label: 'condition', value: props.book?.condition || 'not listed' },
  { label: 'collection', value: props.book?.collectionarea || props.book?.mrtstation?.name },
].filter(field => field.value));
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent v-if="props.book || props.error || props.loading" @close-auto-focus="emit('close-auto-focus', $event)">
      <DialogHeader>
        <DialogTitle>Book details</DialogTitle>
        <DialogDescription>details for the selected book</DialogDescription>
      </DialogHeader>

      <div class="dialog-body space-y-4">
        <div v-if="props.loading" class="space-y-4" role="status" aria-busy="true">
          <AppBookIdentity loading coverClass="w-16" />
          <div class="space-y-1.5">
            <Skeleton class="h-5 w-24" />
            <Skeleton class="h-4" />
            <Skeleton class="h-4 w-2/3" />
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3">
            <div v-for="index in 5" :key="index" class="space-y-1">
              <Skeleton class="h-3.5 w-1/2" />
              <Skeleton class="h-4" />
            </div>
          </div>
        </div>

        <div v-else-if="props.error" role="alert" class="space-y-3"><p>{{ props.error }}</p><button type="button" class="underline min-h-11" @click="emit('retry')">Retry book details</button></div>
        <div v-else-if="!props.error" class="space-y-4">
          <div class="flex items-start gap-2.5">
            <AppBookIdentity :title="props.book.title" :author="props.book.authors?.join(', ') || 'author not listed'"
              :cover="props.book.coverurl" coverClass="w-16" class="flex-1" wrap />
            <slot name="book-action" :book="props.book">
            <button v-if="props.canSave || props.saved" type="button" class="washi-tape-hover min-h-11 min-w-11 shrink-0 rounded-lg p-2"
              :disabled="!props.canSave || props.busy"
              :title="props.saved ? 'Remove from saved books' : 'Save to saved books'"
              :aria-label="props.saved ? 'Remove from saved books' : 'Save to saved books'"
              :aria-pressed="props.saved"
              @click="emit('save', props.book)">
              <HugeiconsIcon :icon="Bookmark02Icon" class="size-6"
                :class="{ 'fill-success-foreground text-success-foreground': props.saved }" aria-hidden="true" />
            </button>
            </slot>
          </div>

          <div class="space-y-1.5">
            <h3>Description</h3>
            <p v-if="description" class="text-sm leading-relaxed text-muted-foreground">{{ description }}</p>
            <p v-else class="text-sm text-muted-foreground italic">no description available</p>
          </div>

          <dl class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div v-for="field in fields" :key="field.label" class="space-y-0.5">
              <dt class="text-xs text-muted-foreground">{{ field.label }}</dt>
              <dd>
                <a v-if="field.label === 'collection'"
                  :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${field.value}, Singapore`)}`"
                  target="_blank" rel="noopener noreferrer" class="underline underline-offset-4">{{ field.value }}</a>
                <template v-else>{{ field.value }}</template>
              </dd>
            </div>
          </dl>
        </div>

        <slot v-if="!props.loading && !props.error" name="details" :book="props.book" />

        <DialogFooter v-if="!props.loading && !props.error && $slots.actions">
          <slot name="actions" />
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
