<script setup>
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { computed } from 'vue';
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

const props = defineProps({
    records: {type: Array},
    columns: {type: Array},
    modelValue: {type: Array}, // lee-hlmilk > array of selected row IDs, for v-model
    loading: {type: Boolean, default: false},
    emptyTitle: {type: String, default: 'No matching records.'},
    emptyDescription: {type: String, default: 'Items will appear here when there is something to show.'},
    showClearFilters: {type: Boolean, default: false},
    rowKey: {type: String, default: 'id'},
});

const emits = defineEmits(['update:modelValue', 'open-record', 'clear-filters']);

const selectedCount = computed(() => {
    return props.records.filter((r) => props.modelValue.includes(r[props.rowKey])).length
});


// lee-hlmilk > master checkbox state helper
const selectAllState = computed(() => {
    const total = props.records.length
    if (total === 0 || selectedCount.value ===  0) {return false}
    if (selectedCount.value === total) {return true}
    return 'indeterminate'
});

// lee-hlmilk > tick for one
function toggleRow(recordId) {
  if (props.modelValue.includes(recordId)) {
    const next = props.modelValue.filter((id) => id !== recordId)
    emits('update:modelValue', next)
  } else {
    emits('update:modelValue', [...props.modelValue, recordId])
  }
};

// lee-hlmilk > master checkbox, tick all visible
function toggleSelectAll() {
  const visibleIds = props.records.map((r) => r[props.rowKey])
  if (selectAllState.value === true) {
    const next = props.modelValue.filter((id) => !visibleIds.includes(id))
    emits('update:modelValue', next)
  } else {
    const next = [...props.modelValue]
    for (const id of visibleIds) {
      if (!next.includes(id)) {
        next.push(id)
      }
    }
    emits('update:modelValue', next)
  }
};
</script>

<template>
    <div>
        <!-- lee-hlmilk > loading skeleton, subtle shadow & inner padding -->
        <div v-if="loading" class="rounded-lg border bg-card shadow-xs p-4" role="status" aria-busy="true">
            <!-- lee-hlmilk > separate columns, space below content, separate header from rows-->
            <div class="flex items-center gap-4 pb-3 border-b">
                <Skeleton class="size-4.5 rounded"></Skeleton>
                <Skeleton class="h-4 w-28"></Skeleton>
                <Skeleton class="h-4 w-36"></Skeleton>
                <Skeleton class="h-4 w-20 ml-auto"></Skeleton>
            </div>
            
            <!-- lee-hlmilk > align columns similar to above, vertical padding per row, separator and opacity control, remove last separator-->
            <div v-for="i in 4" :key="i" class="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
                <Skeleton class="size-4.5 rounded"></Skeleton>
                <Skeleton class="h-4 w-32"></Skeleton>
                <Skeleton class="h-4 w-48"></Skeleton>
                <Skeleton class="h-4 w-16 ml-auto"></Skeleton>
            </div>
        </div>

        <!-- lee-hlmilk > data table -->
        <div v-else-if="records.length > 0" class="overflow-hidden rounded-lg border bg-card shadow-xs">
            <Table>
                <TableHeader class="bg-muted/60">
                    <TableRow>
                        <!-- lee-hlmilk > reserve column for checkboxes -->
                        <TableHead class="w-12">
                            <Checkbox :model-value="selectAllState" aria-label="Select all visible records" @update:model-value="toggleSelectAll"></Checkbox>
                        </TableHead>

                        <TableHead v-for="col in columns" :key="col.key">
                            {{ col.label }}
                        </TableHead>

                        <!-- lee-hlmilk > reserve column for arrow icon-->
                        <TableHead class="w-10">
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    <TableRow v-for="record in records" :key="record[rowKey]" :data-state="modelValue.includes(record[rowKey]) ? 'selected' : undefined " @click="emits ('open-record', record)">
                        <TableCell @click.stop>
                            <Checkbox :model-value="modelValue.includes(record[rowKey])" :aria-label="`Select record ${record[rowKey]}`" @update:model-value="toggleRow(record[rowKey])"></Checkbox>
                        </TableCell>

                        <TableCell v-for="col in columns" :key="col.key">
                            <slot :name="`cell-${col.key}`" :record="record" :value="record[col.key]">
                                <slot name="cell" :record="record" :column="col" :value="record[col.key]">
                                    <span>{{ record[col.key] }}</span>
                                </slot>
                            </slot>
                        </TableCell>
                        <!-- lee-hlmilk > flush right for arrowhead icon and equal width and height-->
                        <TableCell class="text-right text-muted-foreground">
                            <HugeiconsIcon :icon="ArrowRight01Icon" class="inline-block size-4.5" aria-hidden="true"></HugeiconsIcon>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <!-- lee-hlmilk > no records, more spacing for texts -->
        <div v-else class="rounded-lg border bg-card p-8 text-center shadow-xs">
            <slot name="empty">
                <h2>{{ emptyTitle }}</h2>
                <!-- lee-hlmilk > separate desc from heading, smaller text, limit line length, centres paragraph-->
                <p class="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{{ emptyDescription }}</p>
            </slot>
            <div v-if="showClearFilters" class="mt-4">
                <Button variant="default" @click="emits('clear-filters')">Clear filters</Button>
            </div>
        </div>
    </div>
</template>
