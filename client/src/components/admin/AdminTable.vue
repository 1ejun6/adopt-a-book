<script setup>
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

const props = defineProps({
  disabled: Boolean,
  rows: { type: Array },
  columns: { type: Array },
  compact: { type: Boolean, default: false },
  selectedIds: { type: Array, default: () => [] },
  selectable: { type: Boolean, default: true },
  selectionColumn: { type: Boolean, default: true },
  rowAction: { type: String, default: 'open' },
  isLoading: { type: Boolean, default: false },
  emptyTitle: { type: String, default: 'no matching rows' },
  emptyDescription: { type: String, default: 'no rows to display' }
});

const emit = defineEmits(['selectedRows', 'openRow']);

//@lee-hlmilk > selectedIds is parent-owned > emit a replacement array instead of changing the prop
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
  if (props.disabled || !props.selectable) { return; }
  const selectedIdsAfterToggle = rowSelected(rowId) ? props.selectedIds.filter((id) => id !== rowId) : [...props.selectedIds, rowId];
  //@1ejun6 > if row is selected remove its id > add its id
  emit('selectedRows', selectedIdsAfterToggle);
}

function toggleAllRows() {
  if (props.disabled || !props.selectable) { return; }
  const rowIds = new Set(props.rows.map(row => row.id)); //@1ejun6 > get ids of all rows currently displayed in table
  const selectedIdsAfterToggle = headerCheckboxState.value === true ? props.selectedIds.filter(id => !rowIds.has(id)) : [...new Set([...props.selectedIds, ...rowIds])]; //@1ejun6 > new copy
  emit('selectedRows', selectedIdsAfterToggle);
}

//@lee-hlmilk > list pages open records > import results select rows > review rows leave controls to their cell slots
function handleRowClick(row) {
  if (props.disabled) return;
  if (props.rowAction === 'select') { toggleRowSelection(row.id); }
  else if (props.rowAction === 'open') { emit('openRow', row); }
}
</script>

<template>
  <div class="min-w-0">
    <!--@lee-hlmilk > loading placeholders-->
    <div v-if="isLoading" class="border p-5" role="status" aria-busy="true">
      <!--@lee-hlmilk > placeholder header & placeholder rows-->
      <!--@1ejun6 > padding bottom > first row; padding for top & bottom > remaining rows-->
      <div v-for="row in 5" :key="row" class="flex items-center gap-5 border-b"
        :class="row === 1 ? 'pb-2.5' : 'py-2.5'">
        <Skeleton v-if="props.selectionColumn" class="size-4.5" />
        <Skeleton v-for="column in columns" :key="column.key" class="h-4 flex-1" />
        <Skeleton v-if="props.rowAction === 'open'" class="h-4 w-20" />
      </div>
    </div>

    <template v-else-if="rows.length > 0">
      <!-- CSS controls the layout; both views share the same selection state. -->
      <div v-if="!props.compact" class="space-y-3 lg:hidden">
        <label v-if="props.selectionColumn && props.selectable" class="flex min-h-11 items-center gap-3">
          <Checkbox :disabled="props.disabled" :modelValue="headerCheckboxState" aria-label="Select all visible rows"
            @update:modelValue="toggleAllRows" />
          Select all visible rows
        </label>
        <article v-for="row in rows" :key="row.id" class="space-y-3 border p-4"
          :data-state="rowSelected(row.id) ? 'selected' : undefined" :class="rowSelected(row.id) && 'bg-primary'">
          <label v-if="props.selectionColumn && props.selectable" class="flex min-h-11 items-center gap-3">
            <Checkbox :disabled="props.disabled" :modelValue="rowSelected(row.id)" :aria-label="`Select ${row.title || row.id}`"
              @update:modelValue="toggleRowSelection(row.id)" />
            Select record
          </label>
          <dl class="space-y-3">
            <div v-for="column in columns" :key="column.key" class="min-w-0">
              <dt class="text-sm text-muted-foreground" :class="!column.label && 'sr-only'">
                <slot :name="`header${column.key[0].toUpperCase()}${column.key.slice(1)}`" :column="column">{{ column.label || 'Actions' }}</slot>
              </dt>
              <dd class="min-w-0 break-words">
                <slot :name="`cell${column.key[0].toUpperCase()}${column.key.slice(1)}`" :row="row" :value="row[column.key]">
                  {{ row[column.key] }}
                </slot>
              </dd>
            </div>
          </dl>
          <Button :disabled="props.disabled" v-if="props.rowAction === 'open'" type="button" variant="outline" class="w-full "
            :aria-label="`View details for ${row.title || row.customer || row.userid?.name || row.id}`" @click="emit('openRow', row)">
            View details
            <HugeiconsIcon :icon="ArrowRight01Icon" class="ml-2 size-4" aria-hidden="true" />
          </Button>
        </article>
      </div>

      <!-- Desktop and compact lists retain the shared table. -->
      <div :class="!props.compact && 'hidden lg:block'">
        <Table :compact="props.compact">
          <TableHeader class="bg-primary">
            <TableRow>
              <!--@lee-hlmilk > select all visible rows-->
              <TableHead v-if="props.selectionColumn" class="w-16 text-center" @click="toggleAllRows">
                <!--@1ejun6 > stops its click from bubbling up & triggering a parent element click handler-->
                <Checkbox :disabled="props.disabled" v-if="props.selectable" class="mx-auto" :modelValue="headerCheckboxState" aria-label="Select all visible rows" @click.stop
                  @update:modelValue="toggleAllRows" />
              </TableHead>
              <TableHead v-for="column in columns" :key="column.key" :class="column.class">
                <slot :name="`header${column.key[0].toUpperCase()}${column.key.slice(1)}`" :column="column">{{ column.label }}</slot>
              </TableHead>
              <!--@lee-hlmilk > row action column-->
              <TableHead v-if="props.rowAction === 'open'" class="w-16" />
            </TableRow>
          </TableHeader>

          <TableBody>
            <TableRow v-for="row in rows" :key="row.id" :data-state="rowSelected(row.id) ? 'selected' : undefined"
              :class="props.rowAction !== 'none' && 'washi-row washi-tape-hover'" @click="handleRowClick(row)">
              <TableCell v-if="props.selectionColumn" class="text-center"
                :data-active="rowSelected(row.id) ? true : undefined" @click.stop="toggleRowSelection(row.id)">
                <Checkbox :disabled="props.disabled" v-if="props.selectable" class="mx-auto" :modelValue="rowSelected(row.id)" :aria-label="`Select ${row.title || row.id}`" @click.stop
                  @update:modelValue="toggleRowSelection(row.id)" />
              </TableCell>

              <TableCell v-for="column in columns" :key="column.key" class="truncate">
                <!--@lee-hlmilk > column classes size cells > row &&& value let each caller render its own content-->
                <slot :name="`cell${column.key[0].toUpperCase()}${column.key.slice(1)}`" :row="row"
                  :value="row[column.key]">
                  {{ row[column.key] }}
                </slot>
              </TableCell>

              <!--@lee-hlmilk > arrow for opening row-->
              <TableCell v-if="props.rowAction === 'open'" class="text-center">
                <button :disabled="props.disabled" type="button" class="mx-auto grid size-11 place-items-center" :aria-label="`View details for ${row.title || row.customer || row.userid?.name || row.id}`" @click.stop="emit('openRow', row)">
                  <HugeiconsIcon :icon="ArrowRight01Icon" class="size-4" aria-hidden="true" />
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </template>

    <!--@lee-hlmilk > empty table-->
    <div v-else class="border p-5 text-center">
      <slot name="empty">
        <h2>{{ emptyTitle }}</h2>
        <!--@lee-hlmilk > empty table description-->
        <p class="text-sm text-muted-foreground">{{ emptyDescription }}</p>
      </slot>
    </div>
  </div>
</template>
