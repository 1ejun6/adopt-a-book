<script setup>
import { Pagination, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';

defineProps({
    itemLabel: { type: String, default: 'items' },
    total: { type: Number, required: true },
    visibleCount: { type: Number, default: undefined },
    pageSize: { type: Number, required: true },
    pageCount: { type: Number, required: true },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
});

const page = defineModel('page', { type: Number, required: true });
</script>

<template>
    <div class="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-background">
        <p aria-live="polite">
            {{ loading ? `Loading ${itemLabel}…` : `${total === 0 ? 0 : (page - 1) * pageSize + 1}–${Math.min((page - 1) * pageSize + (visibleCount ?? pageSize), total)} of ${total} ${itemLabel}` }}
        </p>
        <Pagination v-model:page="page" :total="total" :itemsPerPage="pageSize"
            :disabled="disabled" class="flex items-center gap-2.5">
            <PaginationPrevious />
            <span aria-live="polite">Page {{ page }} of {{ pageCount }}</span>
            <PaginationNext />
        </Pagination>
    </div>
</template>
