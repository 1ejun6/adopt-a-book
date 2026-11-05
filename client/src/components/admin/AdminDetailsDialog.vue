<script setup>
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';

//@lee-hlmilk > shared details layout > views supply fields &&& content &&& actions through props &&& slots
const props = defineProps({
    busy: Boolean,
    error: { type: String, default: '' },
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
    book: { type: Object, default: null },
    status: { type: String, default: '' },
    description: { type: String, default: '' },
    fields: { type: Array, default: () => [] }
});
const emit = defineEmits(['update:open', 'retry']);
</script>

<template>
    <!--@lee-hlmilk > open is read from the view > update:open asks the view to store X ||| Escape ||| outside-click changes-->
    <Dialog :open="props.open" @update:open="!busy && emit('update:open', $event)">
        <DialogContent :showCloseButton="!busy" :aria-describedby="undefined" class="p-4">
            <p v-if="error" role="alert">{{ error }} Actions are unavailable until details refresh. <button type="button" class="underline min-h-11" :disabled="busy" @click="emit('retry')">Retry details</button></p>
            <DialogHeader>
                <DialogTitle>{{ props.title }}</DialogTitle>
            </DialogHeader>
            <hr>
            <div class="space-y-5">
                <div v-if="props.book || props.status || $slots.summary" class="flex flex-wrap items-center justify-between gap-5">
                    <!--@lee-hlmilk > book identity is optional > other records such as drives can supply their own summary-->
                    <slot name="summary">
                        <BookIdentity v-if="props.book" class="flex-1" :title="props.book.title || 'Untitled'"
                            :author="props.book.authors?.join(', ') || props.book.author || 'Unknown Author'"
                            :cover="props.book.cover || props.book.thumbnailurl || props.book.coverurl" />
                    </slot>
                    <StatusBadge v-if="props.status" :status="props.status" class="shrink-0" />
                </div>
                <p v-if="props.description" class="whitespace-pre-line">{{ props.description }}</p>
                <dl v-if="props.fields.length" class="grid gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)]">
                    <!--@lee-hlmilk > mobile stacks labels above values > sm uses label/value columns with a shrinkable value track-->
                    <template v-for="field in props.fields" :key="field.label">
                        <dt class="text-muted-foreground">{{ field.label }}</dt>
                        <!--@lee-hlmilk > optional field slots keep related content such as location links with their value-->
                        <dd class="min-w-0"><slot :name="`field-${field.key || field.label}`" :field="field">{{ field.value || 'Not provided' }}</slot></dd>
                    </template>
                </dl>
                <fieldset :disabled="busy || !!error" :inert="busy || !!error" class="min-w-0"><slot /></fieldset>
            </div>
            <!--@lee-hlmilk > read-only records omit actions > no empty footer ||| separator-->
            <template v-if="$slots.actions">
                <hr>
                <DialogFooter class="flex-col sm:flex-row"><fieldset :disabled="busy || !!error" :inert="busy || !!error" class="flex flex-wrap gap-3 w-full min-w-0"><slot name="actions" /></fieldset></DialogFooter>
            </template>
        </DialogContent>
    </Dialog>
</template>
