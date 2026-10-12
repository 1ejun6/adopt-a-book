<script setup>
import { Search01Icon } from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import { computed } from 'vue';

const props = defineProps({
    search: {type: String, default: ''},
    searchPlaceholder: {type: String, default: 'Search...'},
    selectedCount: {type: Number, default: 0},
    hint: {type: String, default: ''} // lee-hlmilk > a small text tip for end user why actions are disabled e.g. multi-selected books but only can edit one at a time
});

const emits = defineEmits(['update:search', 'clear-selection']);

// lee-hlmilk > helper to disable single-record actions (e.g edit) when multi-select
const onlyOne = computed(() => props.selectedCount === 1);

</script>

<template>
    <section class="w-full space-y-4" aaria-label="Table toolbar">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <!-- lee-hlmilk > search input -->
            <div class="relative flex-1 max-w-sm">
                <HugeiconsIcon :icon="Search01Icon" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" aria-hidden="true"></HugeiconsIcon>
                <Input type="search" :model-value="props.search" :placeholder="props.searchPlaceholder" class="pl-9 h-10 bg-card" @update:model-value="emits('update:search', $event)" />
            </div>
            <!-- lee-hlmilk > space for filters (e.g. book genre) & actions (e.g. clear filter) -->
            <div class="flex items-center gap-3">
                <slot name="filters"></slot>
                <slot name="actions"></slot>
            </div>
        </div>

        <div v-if="props.selectedCount > 0" class="flex flex-wrap items-center justify-between gap-3 p-3.5 px-4 rounded-lg bg-accent text-accent-foreground border border-border shadow-xs animate-in fade-in-50 duration-150" role="status">
            <!-- lee-hlmilk > selected counter banner, only visible if got select -->
            <div class="flex items-center gap-3">
                <strong class="text-sm font-semibold text-foreground">{{ props.selectedCount }} selected</strong>
                <small v-if="props.hint" class="text-xs text-muted-foreground">{{ props.hint }}</small>
            </div>
            <!-- lee-hlmilk > allow for different webpage to have different amt of button (e.g. drives got 4 actions)-->
            <div class="flex items-center gap-2" role="group" aria-label="Selected record actions">
                <slot name="selection-actions" :selected-count="props.selectedCount" :only-one="onlyOne"></slot>
            </div>
        </div>
    </section>
</template>