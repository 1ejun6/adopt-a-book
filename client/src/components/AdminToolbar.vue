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
    <!-- lee-hlmilk > separate search/filter row from selection banner -->
    <section class="space-y-4" aria-label="Table toolbar">
        <!-- lee-hlmilk > stack search and controls on small screens, sm places them side by side and vertically aligned > separate groups with spacing -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <!-- lee-hlmilk > relative anchors search icon inside input area, flex-1 uses available space, max-w-sm limits search width -->
            <div class="relative flex-1 max-w-sm">
                <!-- lee-hlmilk > position icon inside left side of input and centre vertically -->
                <HugeiconsIcon :icon="Search01Icon" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" aria-hidden="true"></HugeiconsIcon>
                <!-- lee-hlmilk > reserves space for search icon, sets toolbar input height -->
                <Input type="search" :model-value="props.search" :placeholder="props.searchPlaceholder" class="pl-9 h-10 bg-card" @update:model-value="emits('update:search', $event)" />
            </div>
            <!-- lee-hlmilk > space for page-specific filters and actions, arrange controls side by side, vertically aligned and separated -->
            <div class="flex items-center gap-3">
                <slot name="filters"></slot>
                <slot name="actions"></slot>
            </div>
        </div>

        <!-- lee-hlmilk > show only when records selected, gap-3 keeps spacing when wrapped -->
        <div v-if="props.selectedCount > 0" class="flex flex-wrap items-center justify-between gap-3 py-3.5 px-4 rounded-lg bg-accent text-accent-foreground border shadow-xs animate-in fade-in-50 duration-150" role="status">
            <!-- lee-hlmilk > selected counter and hint banner, only visible if got select -->
            <div class="flex items-center gap-3">
                <strong class="text-sm font-semibold">{{ props.selectedCount }} selected</strong>
                <small v-if="props.hint" class="text-xs text-muted-foreground">{{ props.hint }}</small>
            </div>
            <!-- lee-hlmilk > allow different pages to supply their own buttons, different amt of button (e.g. drives got 4 actions)-->
            <div class="flex items-center gap-2" role="group" aria-label="Selected record actions">
                <slot name="selection-actions" :selected-count="props.selectedCount" :only-one="onlyOne"></slot>
            </div>
        </div>
    </section>
</template>
