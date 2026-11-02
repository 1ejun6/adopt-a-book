<script setup>
import AppSearchInput from '@/components/shared/AppSearchInput.vue';

const props = defineProps({
    searchPlaceholder: { type: String, default: 'search...' },
    selectedRowCount: { type: Number, default: 0 }
});

const search = defineModel('search', { type: String, default: '' });
</script>

<template>
    <section class="space-y-5">
        <slot name="tabs" />

        <!--@lee-hlmilk > search &&& page filters-->
        <div class="flex flex-col gap-2.5 sm:flex-row">
            <AppSearchInput v-model="search" class="flex-1" :placeholder="props.searchPlaceholder" />
            <div v-if="$slots.filters || $slots.actions" class="flex flex-wrap gap-2.5">
                <slot name="filters" />
                <slot name="actions" />
            </div>
        </div>

        <!--@lee-hlmilk > selected row count &&& page actions-->
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
