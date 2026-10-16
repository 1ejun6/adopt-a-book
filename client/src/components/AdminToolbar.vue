<script setup>
import { Input } from '@/components/ui/input';
import { computed } from 'vue';

const props = defineProps({
    search: { type: String, default: '' },
    searchPlaceHolder: { type: String, default: 'Search...' },
    selectedRowCount: { type: Number, default: 0 }
});
const emits = defineEmits(['update:search', 'clearSelection']);
const selectOneRow = computed(() => props.selectedRowCount === 1); //@lee-hlmilk > helper to disable single-record actions > eg. edit > when in multi select
</script>

<template>
    <section class="space-y-5">
        <!--@lee-hlmilk > search &&& page filters-->
        <div class="flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
            <Input type="search" class="h-auto py-2" :model-value="props.search" :placeholder="props.searchPlaceHolder" @update:model-value="emits('update:search', $event)" />
            <div class="flex gap-2.5 sm:shrink-0">
                <slot name="filters"></slot>
            </div>
        </div>

        <!--@lee-hlmilk > selected row count &&& page actions-->
        <div v-if="props.selectedRowCount > 0"
            class="flex rounded-lg items-center gap-2.5 bg-primary p-2.5 text-sm" role="status">
            <strong>{{ props.selectedRowCount }} selected</strong>
            <div class="ml-auto flex gap-2.5" role="group">
                <slot name="selectionActions" :selectedRowCount="props.selectedRowCount" :onlyOne="selectOneRow"></slot>
            </div>
        </div>
    </section>
</template>
