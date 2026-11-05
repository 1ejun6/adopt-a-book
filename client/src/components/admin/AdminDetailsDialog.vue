<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';

//@lee-hlmilk > shared details layout > views supply fields &&& content &&& actions through props &&& slots
const props = defineProps({
    busy: Boolean,
    loading: Boolean,
    error: { type: String, default: '' },
    open: { type: Boolean, default: false },
    title: { type: String, required: true },
    book: { type: Object, default: null },
    status: { type: String, default: '' },
    statusDot: Boolean,
    description: { type: String, default: '' },
    fields: { type: Array, default: () => [] }
});
const emit = defineEmits(['update:open', 'retry']);
</script>

<template>
    <!--@lee-hlmilk > open is read from the view > update:open asks the view to store X ||| Escape ||| outside-click changes-->
    <Dialog :open="props.open" @update:open="!busy && emit('update:open', $event)">
        <DialogContent :showCloseButton="!busy" :aria-describedby="undefined" class="space-y-5 p-5">
            <p v-if="error" role="alert">{{ error }} Actions are unavailable until details refresh. <Button variant="outline" type="button" class="min-h-11" :disabled="busy" :loading="loading" @click="emit('retry')"><AppIcon name="refresh" /><span class="sr-only">Retry details</span></Button></p>
            <DialogHeader class="p-0 pb-5 pr-12">
                <DialogTitle>{{ props.title }}</DialogTitle>
            </DialogHeader>
            <div class="space-y-5" :aria-busy="loading">
                <div v-if="loading" class="space-y-4" role="status" aria-label="Loading details">
                    <BookIdentity v-if="props.book" loading />
                    <Skeleton v-else class="h-6 w-48" />
                    <div v-for="index in 3" :key="index" class="space-y-2">
                        <Skeleton class="h-4 w-24" />
                        <Skeleton class="h-4 w-full" />
                    </div>
                </div>
                <div v-show="!loading" class="space-y-5">
                    <div v-if="props.book || props.status || $slots.summary" class="flex flex-wrap items-center justify-between gap-5">
                        <!--@lee-hlmilk > book identity is optional > other records such as drives can supply their own summary-->
                        <slot name="summary">
                            <BookIdentity v-if="props.book" class="flex-1" :title="props.book.title || 'Untitled'"
                                :author="props.book.authors?.join(', ') || props.book.author || 'Unknown Author'"
                                :cover="props.book.cover || props.book.thumbnailurl || props.book.coverurl" />
                        </slot>
                        <StatusBadge v-if="props.status" :status="props.status" :dot="props.statusDot" :title="props.statusDot ? props.status : undefined" class="shrink-0" />
                    </div>
                    <slot name="statusLegend" />
                    <p v-if="props.description" class="whitespace-pre-line">{{ props.description }}</p>
                    <dl v-if="props.fields.length" class="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-baseline sm:gap-x-4 sm:gap-y-2.5">
                        <!--@lee-hlmilk > mobile stacks labels above values > sm uses label/value columns with a shrinkable value track-->
                        <div v-for="field in props.fields" :key="field.label" class="min-w-0 space-y-0.5 sm:contents">
                            <dt class="text-sm text-muted-foreground sm:text-sm">{{ field.label }}</dt>
                            <!--@lee-hlmilk > optional field slots keep related content such as location links with their value-->
                            <dd class="min-w-0"><slot :name="`field-${field.key || field.label}`" :field="field">{{ field.value || 'Not provided' }}</slot></dd>
                        </div>
                    </dl>
                    <fieldset v-if="$slots.default" :disabled="busy || !!error" :inert="busy || !!error" class="min-w-0"><slot /></fieldset>
                </div>
            </div>
            <!--@lee-hlmilk > read-only records omit actions > no empty footer ||| separator-->
            <DialogFooter v-if="$slots.actions"><fieldset :disabled="busy || !!error" :inert="busy || !!error" class="flex flex-wrap gap-3 w-full min-w-0"><slot name="actions" /></fieldset></DialogFooter>
        </DialogContent>
    </Dialog>
</template>
