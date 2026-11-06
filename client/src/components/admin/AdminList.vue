<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { Button } from '@/components/ui/button';
import { computed, useSlots } from 'vue';
import AppFilters from '@/components/shared/AppFilters.vue';
import AppPage from '@/components/shared/AppPage.vue';
import AppPagination from '@/components/shared/AppPagination.vue';
import AdminTable from '@/components/admin/AdminTable.vue';

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  tabDescription: { type: String, default: '' },
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
  emptyKey: { type: String, default: '' },
  emptyAction: { type: Object, default: null },
  pagination: { type: Object, default: null }
});

//@lee-hlmilk > view owns requests &&& state > models pass toolbar &&& table changes back to it
//@lee-hlmilk > each named model pairs its prop with update:name > assignments update the view's v-model binding
const search = defineModel('search', { type: String, default: '' });
const tab = defineModel('tab', { type: String, default: 'all' });
const selectedIds = defineModel('selectedIds', { type: Array, default: () => [] });
const page = defineModel('page', { type: Number, default: 1 });
const emit = defineEmits(['openRow', 'retry']);
const slots = useSlots();
//@lee-hlmilk > forward custom cell slots &&& empty state to AdminTable > keep page action slots here
const tableSlots = computed(() => Object.keys(slots).filter(name => name.startsWith('cell')));
</script>

<template>
  <!--@lee-hlmilk > AppLayout owns page padding > this shell aligns &&& limits width &&& spaces sections-->
  <AppPage align="left" class="space-y-5">
    <header class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div class="min-w-0">
        <div class="app-page-heading text-left">
          <h1>{{ props.title }}</h1>
          <p v-if="props.description">{{ props.description }}</p>
        </div>
        <div v-if="$slots.legend" class="mt-3"><slot name="legend" /></div>
      </div>
      <slot name="headerActions" />
    </header>

    <fieldset :disabled="props.disabled" :inert="props.disabled" class="min-w-0">
    <AppFilters adminTabs v-model:search="search" v-model:status="tab" :tabs="props.tabs" :counts="props.counts" :tabDescription="props.tabDescription"
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
    </fieldset>
    <div v-if="props.error" role="alert" class="rounded-lg border p-5 space-y-3"><p>{{ props.error }}</p><Button variant="outline" type="button" class="min-h-11" :disabled="props.loading || props.disabled" @click="emit('retry')" :loading="props.loading"><AppIcon name="refresh" /><span class="sr-only">Retry</span></Button></div>

    <AdminTable v-if="!props.error" :rows="props.rows" :columns="props.columns" :selectedIds="selectedIds"
      :disabled="props.disabled || props.loading" :isLoading="props.loading" :selectable="props.selectable" :emptyTitle="props.emptyTitle" :emptyDescription="props.emptyDescription"
      :emptyKey="JSON.stringify([props.emptyKey, search, tab, page])" :emptyAction="props.emptyAction"
      @selectedRows="selectedIds = $event" @openRow="emit('openRow', $event)">
      <!--@lee-hlmilk > scoped slot props come from AdminTable > pass row &&& value through to the view's cell slots-->
      <template v-for="name in tableSlots" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </AdminTable>

    <!--@lee-hlmilk > pagination is optional > views without paged data can omit it-->
    <AppPagination v-if="!props.error && props.pagination" v-model:page="page"
      v-bind="props.pagination" :visibleCount="props.rows.length" :loading="props.loading" :disabled="props.loading || props.disabled" />
  </AppPage>
</template>
