<script setup>
import { computed } from 'vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';

const props = defineProps({ book: { type: Object, default: null } });
const emit = defineEmits(['edit']);
const open = defineModel('open', { type: Boolean, default: false });
const currentBook = computed(() => ({
    ...props.book,
    author: props.book?.authors?.join(', ') || props.book?.author,
    cover: props.book?.cover || props.book?.thumbnailurl || props.book?.coverurl
}));
//@1ejun6 > admin view shows book metadata > missing values stay visible instead of hiding rows
const fields = computed(() => {
    const book = currentBook.value;
    return [
        { label: 'Title', value: book.title },
        { label: 'Authors', value: book.authors?.join(', ') || book.author },
        { label: 'Condition', value: book.condition },
        { label: 'Collection area', value: book.collectionarea || book.mrtstation?.name },
        { label: 'Subjects', value: book.subjects?.join(', ') },
        { label: 'ISBN', value: book.isbn },
        { label: 'First publication', value: book.publicationyear },
        { label: 'Open Library ID', value: book.openlibraryid },
        { label: 'Source', value: book.source === 'open_library' ? 'Open Library' : book.source },
        {
            label: 'Updated at', value: book.updatedat ? new Date(book.updatedat).toLocaleString('en-SG', {
                dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore'
            }) : null
        },
    ];
});

</script>

<template>
    <Dialog v-model:open="open">
        <DialogContent v-if="book">
            <DialogHeader>
                <DialogTitle>Book details</DialogTitle>
                <DialogDescription>details for the selected inventory book</DialogDescription>
            </DialogHeader>
            <hr>
            <div class="space-y-5">
                <div class="flex flex-wrap items-center justify-between gap-5 py-5">
                    <AppBookIdentity :title="currentBook.title" :author="currentBook.author" :cover="currentBook.cover"
                        class="min-w-0 flex-1" />
                    <AppStatusBadge :status="currentBook.status" class="text-sm" />
                </div>
                <p class="whitespace-pre-line">{{ currentBook.description || 'No description recorded.' }}</p>
                <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-5">
                    <template v-for="field in fields" :key="field.label">
                        <dt class="text-muted-foreground">{{ field.label }}</dt>
                        <dd class="min-w-0 [overflow-wrap:anywhere]">{{ field.value || 'Not provided' }}</dd>
                    </template>
                </dl>
            </div>
            <hr>
            <DialogFooter>
                <Button type="button" class="w-full" @click="emit('edit', book)">Edit</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
