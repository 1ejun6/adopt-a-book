<script setup>
import { CheckboxRoot, CheckboxIndicator } from 'reka-ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { computed } from 'vue';
import { ArrowRight01Icon, Tick02Icon } from '@hugeicons/core-free-icons';

const props = defineProps({
    records: {type: Array},
    columns: {type: Array},
    modelValue: {type: Array},
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

const selectAllState = computed(() => {
    const total = props.records.length
    if (total === 0 || selectedCount.value ===  0) {return false}
    if (selectedCount.value === total) {return true}
    return 'indeterminate'
});

function toggleRow(recordId) {
  if (props.modelValue.includes(recordId)) {
    const next = props.modelValue.filter((id) => id !== recordId)
    emits('update:modelValue', next)
  } else {
    emits('update:modelValue', [...props.modelValue, recordId])
  }
};

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
    <div class="w-full">
        <!-- loading skeleton -->
        <div v-if="loading" class="overflow-hidden rounded-lg border border-border bg-card shadow-xs p-4" role="status" aria-busy="true">
            <div class="space-y-3">
                <div class="flex items-center gap-4 pb-3 border-b border-border">
                    <Skeleton class="size-4.5 rounded"></Skeleton>
                    <Skeleton class="h-4 w-28"></Skeleton>
                    <Skeleton class="h-4 w-36"></Skeleton>
                    <Skeleton class="h-4 w-20 ml-auto"></Skeleton>
                </div>

                <div v-for="i in 4" :key="i" class="flex items-center gap-4 py-3 border-b border-border/50 last:border-0">
                    <Skeleton class="size-4.5 rounded"></Skeleton>
                    <Skeleton class="h-4 w-32"></Skeleton>
                    <Skeleton class="h-4 w-48"></Skeleton>
                    <Skeleton class="h-4 w-16 ml-auto"></Skeleton>
                </div>
            </div>
        </div>

        <!-- data table -->
        <div v-else-if="records.length > 0" class="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
            <Table>
                <TableHeader class="bg-muted/60">
                    <TableRow>
                        <TableHead class="w-12 text-center">
                            <CheckboxRoot :model-value="selectAllState" class="size-4.5 rounded border border-input bg-card flex items-center justify-center cursor-pointer transition-colors data-[state=checked]:bg-foreground data-[state=indeterminate]:bg-foreground" @update:model-value="toggleSelectAll">
                                <CheckboxIndicator class="flex items-center justify-center text-background">
                                    <span v-if="selectAllState === 'indeterminate'" class="block h-0.5 w-2.5 bg-background rounded-full"></span>
                                    <HugeiconsIcon v-else :icon="Tick02Icon" class="size-3.5 stroke-[3]"></HugeiconsIcon>
                                </CheckboxIndicator>
                            </CheckboxRoot>
                        </TableHead>

                        <TableHead v-for="col in columns" :key="col.key">
                            {{ col.label }}
                        </TableHead>

                        <TableHead class="w-10 text-right">
                            <span class="sr-only">Open details</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    <TableRow v-for="record in records" :key="record[rowKey]" :data-state="modelValue.includes(record[rowKey]) ? 'selected' : undefined " class="cursor-pointer" @click="emits ('open-record', record)">
                        <TableCell class="w-12 text-center" @click.stop>
                            <CheckboxRoot :model-value="modelValue.includes(record[rowKey])" class="size-4.5 rounded border border-input bg-card flex items-center justify-center cursor-pointer transition-colors data-[state=checked]:bg-foreground" @update:model-value="toggleRow(record[rowKey])">
                                <CheckboxIndicator class="flex items-center justify-center text-background">
                                    <HugeiconsIcon :icon="Tick02Icon" class="size-3.5 stroke-[3]"></HugeiconsIcon>
                                </CheckboxIndicator>
                            </CheckboxRoot>
                        </TableCell>

                        <TableCell v-for="col in columns" :key="col.key">
                            <slot :name="`cell-${col.key}`" :record="record" :value="record[col.key]">
                                <slot name="cell" :record="record" :column="col" :value="record[col.key]">
                                    <span>{{ record[col.key] }}</span>
                                </slot>
                            </slot>
                        </TableCell>

                        <TableCell class="w-10 text-right text-muted-foreground">
                            <HugeiconsIcon :icon="ArrowRight01Icon" class="inline-block size-4.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true"></HugeiconsIcon>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <div v-else class="rounded-lg border border-border bg-card p-8 text-center shadow-xs">
            <slot name="empty">
                <h2 class="font-heading text-2xl text-foreground">{{ emptyTitle }}</h2>
                <p class="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{{ emptyDescription }}</p>
            </slot>
            <div v-if="showClearFilters" class="mt-4">
                <Button variant="default" @click="emits('clear-filters')">Clear filters</Button>
            </div>
        </div>
    </div>
</template>