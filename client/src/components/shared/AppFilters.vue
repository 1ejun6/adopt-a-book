<script setup>
import AppToolbar from '@/components/shared/AppToolbar.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

defineProps({
    tabs: { type: Array, default: () => [] },
    counts: { type: Object, default: () => ({}) },
    searchPlaceholder: { type: String, default: 'search...' },
    genres: { type: Array, default: () => [] },
    selectedRowCount: { type: Number, default: 0 }
});

const search = defineModel('search', { type: String, default: '' });
const status = defineModel('status', { type: String, default: 'all' });
const genre = defineModel('genre', { type: String, default: 'all' });
</script>

<template>
    <AppToolbar v-model:search="search" :searchPlaceholder="searchPlaceholder"
        :selectedRowCount="selectedRowCount">
        <template v-if="tabs.length || $slots.tabs" #tabs>
            <slot name="tabs" :counts="counts" :status="status">
                <Tabs v-model="status">
                    <TabsList>
                        <TabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value" class="gap-2.5">
                            <slot name="tab" :tab="tab" :count="counts[tab.value]">
                                {{ tab.label }}
                                <Badge v-if="!tab.status && counts[tab.value] != null" class="bg-primary tabular-nums">
                                    {{ counts[tab.value] }}
                                </Badge>
                                <StatusBadge v-else-if="counts[tab.value] != null" :status="tab.status" class="tabular-nums">
                                    {{ counts[tab.value] }}
                                </StatusBadge>
                            </slot>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </slot>
        </template>

        <template #filters>
            <slot name="filters">
                <select v-model="genre" class="rounded-lg border p-2.5 text-sm leading-4">
                    <option value="all">All genres</option>
                    <option v-for="item in genres" :key="item" :value="item">{{ item }}</option>
                </select>
            </slot>
        </template>
        <template v-if="$slots.actions" #actions>
            <slot name="actions" />
        </template>
        <template v-if="$slots.selectionActions" #selectionActions="slotProps">
            <slot name="selectionActions" v-bind="slotProps" />
        </template>
    </AppToolbar>
</template>
