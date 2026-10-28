<script setup>
import { computed } from 'vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';

//@lee-hlmilk > presentation only > view owns selection &&& decision requests through props &&& emits
const props = defineProps({
    open: { type: Boolean, default: false },
    application: { type: Object, default: null },
    decisionHint: { type: String, default: '' }
});
const emit = defineEmits(['update:open', 'decide']);
const fields = computed(() => [
    { label: 'Applicant', value: props.application?.userid?.name },
    { label: 'Email', value: props.application?.userid?.email },
    { label: 'Submitted', value: props.application?.createdat ? new Date(props.application.createdat).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' }) : null },
    { label: 'Collection area', value: props.application?.bookid?.collectionarea }
]);
</script>

<template>
    <Dialog :open="props.open" @update:open="emit('update:open', $event)">
        <DialogContent v-if="props.application" :aria-describedby="undefined">
            <DialogHeader>
                <DialogTitle>Application details</DialogTitle>
            </DialogHeader>
            <hr>
            <div class="space-y-5">
                <div class="flex items-center justify-between gap-5">
                    <BookIdentity :title="props.application.bookid?.title || 'Untitled'" class="min-w-0 flex-1"
                        :author="props.application.bookid?.authors?.join(', ') || 'Unknown Author'" :cover="props.application.bookid?.coverurl" />
                    <StatusBadge :status="props.application.status" class="shrink-0" />
                </div>
                <dl class="grid gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)]">
                    <template v-for="field in fields" :key="field.label">
                        <dt class="text-muted-foreground">{{ field.label }}</dt>
                        <dd class="min-w-0">{{ field.value || 'Not provided' }}</dd>
                    </template>
                </dl>
                <!--@lee-hlmilk > customer reasons are not supplied by the API yet > show the agreed empty placeholder-->
                <div class="space-y-2.5">
                    <p class="text-muted-foreground">Reason</p>
                    <p>No reason stated.</p>
                </div>
                <p v-if="props.application.status === 'pending' && props.decisionHint" class="text-sm text-muted-foreground">{{ props.decisionHint }}</p>
            </div>
            <!--@lee-hlmilk > reviewed applications are read-only > decision actions remain available only for pending requests-->
            <template v-if="props.application.status === 'pending'">
                <hr>
                <DialogFooter>
                    <Button type="button" variant="destructive" class="flex-1" :disabled="!!props.decisionHint" @click="emit('decide', 'rejected')">Reject</Button>
                    <Button type="button" class="flex-1" :disabled="!!props.decisionHint" @click="emit('decide', 'approved')">Approve</Button>
                </DialogFooter>
            </template>
        </DialogContent>
    </Dialog>
</template>
