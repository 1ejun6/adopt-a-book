<script setup>
import AdminTabs from '@/components/admin/AdminTabs.vue';
import AppToolbar from '@/components/shared/AppToolbar.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

defineProps({
    adminTabs: { type: Boolean, default: false },
    tabDescription: { type: String, default: '' },
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
            <div class="space-y-3">
                <slot name="tabs" :counts="counts" :status="status">
                    <AdminTabs v-if="adminTabs" v-model="status" :tabs="tabs" label="Admin views">
                        <template #tab="{ tab }">
                            <slot name="tab" :tab="tab" :count="counts[tab.value]">
                                {{ tab.label }}
                                <Badge v-if="!tab.status && counts[tab.value] != null" class="bg-primary">{{ counts[tab.value] }}</Badge>
                                <StatusBadge v-else-if="counts[tab.value] != null" :status="tab.status" :tone="tab.tone">{{ counts[tab.value] }}</StatusBadge>
                            </slot>
                        </template>
                    </AdminTabs>
                    <Tabs v-else v-model="status">
                        <TabsList>
                            <TabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value" class="h-auto  max-w-full gap-2.5 py-2 text-left">
                                <slot name="tab" :tab="tab" :count="counts[tab.value]">
                                    {{ tab.label }}
                                    <Badge v-if="!tab.status && counts[tab.value] != null" class="bg-primary">
                                        {{ counts[tab.value] }}
                                    </Badge>
                                    <StatusBadge v-else-if="counts[tab.value] != null" :status="tab.status" :tone="tab.tone">
                                        {{ counts[tab.value] }}
                                    </StatusBadge>
                                </slot>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </slot>
                <p v-if="tabDescription" class="text-sm text-muted-foreground">{{ tabDescription }}</p>
            </div>
        </template>

        <template #filters>
            <!--@lee-hlmilk > an explicitly empty filter slot means search only > keep genres as the default only when no slot is supplied-->
            <slot v-if="$slots.filters" name="filters" />
            <select v-else v-model="genre" class="h-11 w-full min-w-0 rounded-lg border px-3 sm:w-auto text-sm">
                <option value="all">All</option>
                <option v-for="item in genres" :key="item" :value="item">{{ item }}</option>
            </select>
        </template>
        <template v-if="$slots.actions" #actions>
            <slot name="actions" />
        </template>
        <template v-if="$slots.selectionActions" #selectionActions="slotProps">
            <slot name="selectionActions" v-bind="slotProps" />
        </template>
    </AppToolbar>
</template>
