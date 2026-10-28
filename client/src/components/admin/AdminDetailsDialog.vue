<script setup>
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';

//@lee-hlmilk > shared details layout > views supply fields &&& content &&& actions through props &&& slots
const props = defineProps({
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
    book: { type: Object, default: null },
    status: { type: String, default: '' },
    description: { type: String, default: '' },
    fields: { type: Array, default: () => [] },
    summaryClass: { type: null, default: null }
});
const emit = defineEmits(['update:open']);
</script>

<template>
    <Dialog :open="props.open" @update:open="emit('update:open', $event)">
        <DialogContent :aria-describedby="undefined">
            <DialogHeader>
                <DialogTitle>{{ props.title }}</DialogTitle>
            </DialogHeader>
            <hr>
            <div class="space-y-5">
                <div v-if="props.book || props.status || $slots.summary" class="flex flex-wrap items-center justify-between gap-5" :class="props.summaryClass">
                    <!--@lee-hlmilk > book identity is optional > other records such as drives can supply their own summary-->
                    <slot name="summary">
                        <BookIdentity v-if="props.book" class="min-w-0 flex-1" :title="props.book.title || 'Untitled'"
                            :author="props.book.authors?.join(', ') || props.book.author || 'Unknown Author'"
                            :cover="props.book.cover || props.book.thumbnailurl || props.book.coverurl" />
                    </slot>
                    <StatusBadge v-if="props.status" :status="props.status" class="shrink-0" />
                </div>
                <p v-if="props.description" class="whitespace-pre-line">{{ props.description }}</p>
                <dl v-if="props.fields.length" class="grid gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)]">
                    <template v-for="field in props.fields" :key="field.label">
                        <dt class="text-muted-foreground">{{ field.label }}</dt>
                        <dd class="min-w-0">{{ field.value || 'Not provided' }}</dd>
                    </template>
                </dl>
                <slot />
            </div>
            <!--@lee-hlmilk > read-only records omit actions > no empty footer ||| separator-->
            <template v-if="$slots.actions">
                <hr>
                <DialogFooter><slot name="actions" /></DialogFooter>
            </template>
        </DialogContent>
    </Dialog>
</template>
