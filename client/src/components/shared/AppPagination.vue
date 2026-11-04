<script setup>
import { computed } from 'vue';
import { getPageCount } from '@/lib/utils';
import { Pagination, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';

const props = defineProps({
    itemLabel: { type: String, default: 'items' },
    total: { type: Number, required: true },
    visibleCount: { type: Number, default: undefined },
    pageSize: { type: Number, required: true },
    pageCount: { type: Number, default: undefined },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
});

const page = defineModel('page', { type: Number, required: true });
const resolvedPageCount = computed(() => props.pageCount ?? getPageCount(props.total, props.pageSize));
</script>

<template>
    <div
        class="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
        <p aria-live="polite">
            {{ loading ? `Loading ${itemLabel}…` : `${total === 0 ? 0 : (page - 1) * pageSize + 1}–${Math.min((page - 1)
                * pageSize + (visibleCount ?? pageSize), total)} of ${total} ${itemLabel}` }}
        </p>
        <Pagination v-model:page="page" :total="total" :itemsPerPage="pageSize" :disabled="disabled"
            class="flex items-center sm:gap-2.5">
            <PaginationPrevious />
            <span aria-live="polite">Page {{ page }} of {{ resolvedPageCount }}</span>
            <PaginationNext />
        </Pagination>
    </div>
</template>
