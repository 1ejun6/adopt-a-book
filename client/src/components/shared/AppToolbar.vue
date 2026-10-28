<script setup>
import { Input } from '@/components/ui/input';

const props = defineProps({
    searchPlaceholder: { type: String, default: 'search...' },
    selectedRowCount: { type: Number, default: 0 }
});

//@lee-hlmilk > Input's modelValue updates this search model > update:search travels back through AppFilters to the view
const search = defineModel('search', { type: String, default: '' });
</script>

<template>
    <section class="space-y-5">
        <slot name="tabs" />

        <!--@lee-hlmilk > search & page filters-->
        <!--@lee-hlmilk > stack controls on mobile > sm puts search &&& filters in one row > matching padding/leading aligns their heights-->
        <div class="flex flex-col gap-2.5 sm:flex-row">
            <Input type="search" v-model="search" class="h-auto flex-1 p-2.5 text-sm leading-4" :placeholder="props.searchPlaceholder" />
            <div v-if="$slots.filters || $slots.actions" class="flex flex-wrap gap-2.5">
                <slot name="filters" />
                <slot name="actions" />
            </div>
        </div>

        <!--@lee-hlmilk > selected row count & page actions-->
        <div v-if="props.selectedRowCount > 0"
            class="flex flex-wrap items-center gap-2.5" role="status">
            <strong>{{ props.selectedRowCount }} selected</strong>
            <div v-if="$slots.selectionActions" class="ml-auto flex flex-wrap gap-2.5" role="group">
                <!--@lee-hlmilk > helper to disable single-record actions > eg. edit > when in multi select-->
                <slot name="selectionActions" :selectedRowCount="props.selectedRowCount" :onlyOne="props.selectedRowCount === 1"></slot>
            </div>
        </div>
    </section>
</template>
