<script setup>
import AppSearchInput from '@/components/shared/AppSearchInput.vue';

const props = defineProps({
    searchPlaceholder: { type: String, default: 'search...' },
    searchLabel: { type: String, default: undefined },
    searchId: { type: String, default: undefined },
    searchDescription: { type: String, default: undefined },
    searchDisabled: { type: Boolean, default: false },
    selectedRowCount: { type: Number, default: 0 }
});

//@lee-hlmilk > Input's modelValue updates this search model > update:search travels back through AppFilters to the view
const search = defineModel('search', { type: String, default: '' });
</script>

<template>
    <section class="space-y-5">
        <slot name="tabs" />
        <slot name="search-label" />

        <!--@lee-hlmilk > search & page filters-->
        <!--@lee-hlmilk > stack controls on mobile > sm puts search &&& filters in one row > matching padding/leading aligns their heights-->
        <div class="flex min-w-0 flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:items-end">
            <AppSearchInput v-model="search" class="lg:flex-1" :id="props.searchId" :aria-describedby="props.searchDescription" :aria-label="props.searchLabel || props.searchPlaceholder" :placeholder="props.searchPlaceholder" :disabled="props.searchDisabled" />
            <div v-if="$slots.filters || $slots.actions" class="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-end">
                <slot name="filters" />
                <slot name="actions" />
            </div>
        </div>

        <!--@lee-hlmilk > selected row count & page actions-->
        <div v-if="props.selectedRowCount > 0"
            class="flex flex-wrap items-center gap-2.5" role="status">
            <strong>{{ props.selectedRowCount }} selected</strong>
            <div v-if="$slots.selectionActions" class="flex w-full flex-col gap-2.5 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap" role="group">
                <!--@lee-hlmilk > helper to disable single-record actions > eg. edit > when in multi select-->
                <slot name="selectionActions" :selectedRowCount="props.selectedRowCount" :onlyOne="props.selectedRowCount === 1"></slot>
            </div>
        </div>
    </section>
</template>
