<script setup>
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { computed } from 'vue';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

const props = defineProps({
  rows: { type: Array },
  columns: { type: Array },
  selectedIds: { type: Array },
  isLoading: { type: Boolean, default: false },
  emptyTitle: { type: String, default: 'no matching rows' },
  emptyDescription: { type: String, default: 'no rows to display' }
});

const emit = defineEmits(['selectedRows', 'openRow']);

const selectedIds = computed(() => new Set(props.selectedIds));
function rowSelected(rowId) { return selectedIds.value.has(rowId); }

const headerCheckboxState = computed(() => {
  const totalRowCount = props.rows.length;
  const selectedTotalRowCount = props.rows.filter((row) => rowSelected(row.id)).length;

  if (!selectedTotalRowCount) { return false; }
  if (selectedTotalRowCount === totalRowCount) { return true; }

  return 'indeterminate';
});

function toggleRowSelection(rowId) {
  const selectedIdsAfterToggle = rowSelected(rowId) ? props.selectedIds.filter((id) => id !== rowId) : [...props.selectedIds, rowId];
  //@1ejun6 > if row is selected remove its id > add its id
  emit('selectedRows', selectedIdsAfterToggle);
}

function toggleAllRows() {
  const rowIds = new Set(props.rows.map(row => row.id)); //@1ejun6 > get ids of all rows currently displayed in table
  const selectedIdsAfterToggle = headerCheckboxState.value === true ? props.selectedIds.filter(id => !rowIds.has(id)) : [...new Set([...props.selectedIds, ...rowIds])]; //@1ejun6 > new copy
  emit('selectedRows', selectedIdsAfterToggle);
}
</script>

<template>
  <div>
    <!--@lee-hlmilk > loading placeholders-->
    <div v-if="isLoading" class="rounded-lg border p-5" role="status" aria-busy="true">
      <!--@lee-hlmilk > placeholder header &&& placeholder rows-->
      <!--@1ejun6 > padding bottom > first row; padding for top &&& bottom > remaining rows-->
      <div v-for="row in 5" :key="row" class="flex items-center gap-5 border-b"
        :class="row === 1 ? 'pb-2.5' : 'py-2.5'">
        <Skeleton class="size-4.5 rounded-lg" />
        <Skeleton v-for="column in columns" :key="column.key" class="h-4 flex-1" />
        <Skeleton class="h-4 w-20 ml-auto" />
      </div>
    </div>

    <!--@lee-hlmilk > table rows-->
    <Table v-else-if="rows.length > 0">
      <TableHeader class="bg-primary">
        <TableRow>
          <!--@lee-hlmilk > select all visible rows-->
          <TableHead class="w-10 text-center align-middle" @click="toggleAllRows">
            <!--@1ejun6 > stops its click from bubbling up &&& triggering a parent element click handler-->
            <Checkbox class="mx-auto block" :modelValue="headerCheckboxState" @click.stop
              @update:modelValue="toggleAllRows" />
          </TableHead>
          <TableHead v-for="column in columns" :key="column.key" :class="column.class">
            {{ column.label }}
          </TableHead>
          <!--@lee-hlmilk > row action column-->
          <TableHead />
        </TableRow>
      </TableHeader>

      <TableBody>
        <TableRow v-for="row in rows" :key="row.id" :data-state="rowSelected(row.id) ? 'selected' : undefined"
          class="washi-row washi-tape-hover" @click="emit('openRow', row)">
          <TableCell class="washi-tape washi-left w-10 text-center"
            :data-active="rowSelected(row.id) ? true : undefined" @click.stop="toggleRowSelection(row.id)">
            <Checkbox class="mx-auto block" :modelValue="rowSelected(row.id)" @click.stop
              @update:modelValue="toggleRowSelection(row.id)" />
          </TableCell>

          <TableCell v-for="column in columns" :key="column.key" :class="column.class">
            <slot :name="`cell${column.key[0].toUpperCase()}${column.key.slice(1)}`" :row="row"
              :value="row[column.key]">
              {{ row[column.key] }}
            </slot>
          </TableCell>

          <!--@lee-hlmilk > arrow for opening row-->
          <TableCell class="text-center">
            <button type="button" class="mx-auto block" @click.stop="emit('openRow', row)">
              <HugeiconsIcon :icon="ArrowRight01Icon" aria-hidden="true" />
            </button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <!--@lee-hlmilk > empty table-->
    <div v-else class="rounded-lg border p-5 text-center">
      <slot name="empty">
        <h2>{{ emptyTitle }}</h2>
        <!--@lee-hlmilk > empty table description-->
        <p class="text-sm text-muted-foreground">{{ emptyDescription }}</p>
      </slot>
    </div>
  </div>
</template>
