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
const emit = defineEmits(['save']);

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
    <DialogContent v-if="props.book">
      <DialogHeader>
        <DialogTitle>Book details</DialogTitle>
        <DialogDescription>details for the selected book</DialogDescription>
      </DialogHeader>

      <div class="dialog-body">
        <div v-if="props.loading" class="space-y-2.5" role="status" aria-busy="true">
          <AppBookIdentity loading coverClass="w-16" />
          <Skeleton class="h-5 w-24" />
          <Skeleton class="h-4" />
          <Skeleton class="h-4 w-2/3" />
          <div class="grid grid-cols-2 gap-2.5">
            <div v-for="index in 5" :key="index" class="space-y-2.5">
              <Skeleton class="h-4 w-1/2" />
              <Skeleton class="h-4" />
            </div>
          </div>
        </div>

        <div v-else-if="!props.error" class="space-y-2.5">
          <div class="flex items-center gap-2.5">
            <AppBookIdentity :title="props.book.title" :author="props.book.authors?.join(', ') || 'author not listed'" :cover="props.book.coverurl" coverClass="w-16" class="flex-1" />
            <button v-if="props.canSave || props.saved" type="button" class="shrink-0 rounded-lg p-2" :disabled="!props.canSave || props.busy" :title="props.saved ? 'remove from watchlist' : 'save to watchlist'" :aria-pressed="props.saved" @click="emit('save', props.book)">
              <HugeiconsIcon :icon="Bookmark02Icon" class="size-6" :class="{ 'fill-success-foreground text-success-foreground': props.saved }" aria-hidden="true" />
            </button>
          </div>

          <div class="space-y-2.5">
            <h3>Description</h3>
            <p v-if="description" class="text-muted-foreground leading-6">{{ description }}</p>
            <p v-else class="text-muted-foreground italic">No description available.</p>
          </div>

          <dl class="grid grid-cols-2 gap-2.5">
            <div v-for="field in fields" :key="field.label" class="space-y-2.5">
              <dt class="text-muted-foreground">{{ field.label }}</dt>
              <dd>
                <a v-if="field.label === 'collection'" :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${field.value}, Singapore`)}`" target="_blank" rel="noopener noreferrer" class="underline">{{ field.value }}</a>
                <template v-else>{{ field.value }}</template>
              </dd>
            </div>
          </dl>
        </div>

        <DialogFooter v-if="!props.loading && !props.error && $slots.actions">
          <slot name="actions" />
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>
</template>
