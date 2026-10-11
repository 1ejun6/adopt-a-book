<script setup>
import { CheckboxRoot, CheckboxIndicator } from 'reka-ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { computed } from 'vue'
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
})

const selectAllState = computed(() => {
    const total = props.records.length
    if (total === 0 || selectedCount.value ===  0) {return false}
    if (selectedCount.value === total) {return true}
    return 'indeterminate'
})

function toggleRow(recordId) {
  if (props.modelValue.includes(recordId)) {
    const next = props.modelValue.filter((id) => id !== recordId)
    emits('update:modelValue', next)
  } else {
    emits('update:modelValue', [...props.modelValue, recordId])
  }
}

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
}
</script>

<template>
    <div class="w-full">
        <!-- loading skeleton -->
        <div v-if="loading" class="rounded-lg border border-[#e4d4c4] bg-white p-6 shadow-xs" role="status" aria-busy="true">
            <p>Loading records...</p>
        </div>

        <!-- data table -->
        <div v-else-if="records.length > 0" class="overflow-x-auto rounded-lg border border-[#e4d4c4] bg-white shadow-xs">
            <Table>
                <TableHeader class="bg-[#fcf8f2]">
                    <TableRow class="border-b border-[#e4d4c4]">
                        <TableHead class="w-12 px-4 py-3.5 text-center">
                            <CheckboxRoot :model-value="selectAllState" class="size-4.5 rounded border border-[#b89979] bg-white flex items-center justify-center cursor-pointer transition-colors hover:border-[#7b5330] data-[state=checked]:bg-[#7b5330] data-[state=indeterminate]:bg-[#7b5330] data-[state=checked]:border-[#7b5330] data-[state=indeterminate]:border-[#7b5330]" @update:model-value="toggleSelectAll">
                                <CheckboxIndicator class="flex items-center justify-center text-white">
                                    <span v-if="selectAllState === 'indeterminate'" class="block h-0.5 w-2.5 bg-white rounded-full"></span>
                                    <HugeiconsIcon v-else :icon="Tick02Icon" class="size-3.5 stroke-[3]"></HugeiconsIcon>
                                </CheckboxIndicator>
                            </CheckboxRoot>
                        </TableHead>
                        <TableHead v-for="col in columns" :key="col.key" class="px-4 py-3.5 font-medium text-[#765b43]">
                            {{ col.label }}
                        </TableHead>
                        <TableHead class="w-10 px-3 py-3.5 text-right">
                            <span class="sr-only">Open details</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody class="divide-y divide-[#e4d4c4]">
                    <TableRow v-for="record in records" :key="record[rowKey]" :data-state="modelValue.includes(record[rowKey]) ? 'selected' : undefined " class="group cursor-pointer transition-colors hover:bg-[#fcf8f2] data-[state=selected]:bg-[#f6eee3] data-[state=selected]:shadow-[inset_3px_0_#7b5330]" @click="emits ('open-record', record)">
                        <TableCell class="w-12 px-4 py-3.5 text-center" @click.stop>
                            <CheckboxRoot :model-value="modelValue.includes(record[rowKey])" class="size-4.5 rounded border border-[#b89979] bg-white flex items-center justify-center cursor-pointer transition-colors hover:border-[#7b5330] data-[state=checked]:bg-[#7b5330] data-[state=checked]:border-[#7b5330]" @update:model-value="toggleRow(record[rowKey])">
                                <CheckboxIndicator class="flex items-center justify-center text-white">
                                    <HugeiconsIcon :icon="Tick02Icon" class="size-3.5 stroke-[3]"></HugeiconsIcon>
                                </CheckboxIndicator>
                            </CheckboxRoot>
                        </TableCell>

                        <TableCell v-for="col in columns" :key="col.key" class="px-4 py-3.5 text-[#633b22]">
                            <slot :name="`cell-${col.key}`" :record="record" :value="record[col.key]">
                                <slot name="cell" :record="record" :column="col" :value="record[col.key]">
                                    <span>{{ record[col.key] }}</span>
                                </slot>
                            </slot>
                        </TableCell>

                        <TableCell class="w-10 px-3 py-3.5 text-right text-[#806349]">
                            <HugeiconsIcon :icon="ArrowRight01Icon" class="inline-block size-4.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true"></HugeiconsIcon>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>

        <div v-else class="rounded-lg border border-[#e4d4c4] bg-white p-8 text-center shadow-xs">
            <slot name="empty">
                <h2 class="font-heading text-2x1 text-[#633b22]">{{ emptyTitle }}</h2>
                <p class="mt-2 text-sm text-[#765b43] max-w-md mx-auto">{{ emptyDescription }}</p>
            </slot>
            <div v-if="showClearFilters" class="mt-4">
                <button type="button" class="inline-flex items-center justify-center rounded-md border border-[#dfc8b0] bg-[#fff0f0] px-4 py-2 text-sm font-medium text-[#633b22] hover:bg-[#ffe5e5] transition-colors cursor-pointer" @click="emits('clear-filters')">Clear filters</button>
            </div>
        </div>
    </div>
</template>