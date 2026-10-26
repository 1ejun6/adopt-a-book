<script setup>
import { computed, useSlots } from 'vue';
import AppFilters from '@/components/shared/AppFilters.vue';
import AppPagination from '@/components/shared/AppPagination.vue';
import AdminTable from '@/components/admin/AdminTable.vue';

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  tabs: { type: Array, default: () => [] },
  counts: { type: Object, default: () => ({}) },
  searchPlaceholder: { type: String, default: 'Search...' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  selectable: { type: Boolean, default: true },
  error: { type: String, default: '' },
  emptyTitle: { type: String, default: 'No matching rows' },
  emptyDescription: { type: String, default: 'Try another filter or search term.' },
  pagination: { type: Object, default: null }
});

//@lee-hlmilk > view owns requests &&& state > models pass toolbar &&& table changes back to it
const search = defineModel('search', { type: String, default: '' });
const tab = defineModel('tab', { type: String, default: 'all' });
const selectedIds = defineModel('selectedIds', { type: Array, default: () => [] });
const page = defineModel('page', { type: Number, default: 1 });
const emit = defineEmits(['openRow']);
const slots = useSlots();
//@lee-hlmilk > forward custom cell slots &&& empty state to AdminTable > keep page action slots here
const tableSlots = computed(() => Object.keys(slots).filter(name => name.startsWith('cell') || name === 'empty'));
</script>

<template>
  <main class="mx-auto min-w-0 w-full max-w-7xl space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-5">
      <div class="min-w-0">
        <h1>{{ props.title }}</h1>
        <p v-if="props.description" class="text-muted-foreground">{{ props.description }}</p>
      </div>
      <slot name="headerActions" />
    </header>

    <AppFilters v-model:search="search" v-model:status="tab" :tabs="props.tabs" :counts="props.counts"
      :searchPlaceholder="props.searchPlaceholder" :selectedRowCount="props.selectable ? selectedIds.length : 0">
      <template v-if="$slots.tabs" #tabs="slotProps">
        <slot name="tabs" v-bind="slotProps" />
      </template>
      <!--@lee-hlmilk > replace default genre filter > each admin view supplies its own filters-->
      <template #filters>
        <slot name="filters" />
      </template>
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
      <template v-if="$slots.selectionActions" #selectionActions="slotProps">
        <slot name="selectionActions" v-bind="slotProps" />
      </template>
    </AppFilters>

    <AdminTable v-if="!props.error" :rows="props.rows" :columns="props.columns" :selectedIds="selectedIds"
      :isLoading="props.loading" :selectable="props.selectable" :emptyTitle="props.emptyTitle" :emptyDescription="props.emptyDescription"
      @selectedRows="selectedIds = $event" @openRow="emit('openRow', $event)">
      <template v-for="name in tableSlots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </AdminTable>

    <!--@lee-hlmilk > pagination is optional > views without paged data can omit it-->
    <AppPagination v-if="!props.error && props.pagination && props.pagination.total > 0" v-model:page="page"
      v-bind="props.pagination" :visibleCount="props.rows.length" :loading="props.loading" :disabled="props.loading || props.disabled" />
  </main>
</template>
