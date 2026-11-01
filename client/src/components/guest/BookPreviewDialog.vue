<script setup>
import { computed } from 'vue';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const props = defineProps({ book: { type: Object, default: null } });
const open = defineModel('open', { type: Boolean, default: false });

const fields = computed(() => [
  { label: 'title', value: props.book?.title },
  { label: 'condition', value: props.book?.condition },
  { label: 'collection', value: props.book?.collectionarea || props.book?.mrtstation?.name },
  { label: 'ISBN', value: props.book?.isbn },
  { label: 'published', value: props.book?.publicationyear },
].filter(field => field.value));
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent v-if="book">
      <DialogHeader>
        <DialogTitle>book details</DialogTitle>
        <DialogDescription>details for the selected book</DialogDescription>
      </DialogHeader>
      <hr />
      <div class="space-y-5">
        <AppBookIdentity :title="book.title" :author="book.authors?.join(', ') || 'author not listed'"
          :cover="book.coverurl" />
        <p class="whitespace-pre-line">{{ book.description || 'no description available yet' }}</p>
        <dl class="grid gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)]">
          <template v-for="field in fields" :key="field.label">
            <dt class="text-muted-foreground">{{ field.label }}</dt>
            <dd class="min-w-0">{{ field.value }}</dd>
          </template>
        </dl>
      </div>
    </DialogContent>
  </Dialog>
</template>
