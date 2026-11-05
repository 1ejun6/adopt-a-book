<script setup>
import { SelectContent, SelectPortal, SelectViewport, SelectScrollUpButton, SelectScrollDownButton } from 'reka-ui';
import { ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

defineOptions({ inheritAttrs: false });
const props = defineProps({ class: { type: null, default: null } });
</script>

<template>
  <SelectPortal>
    <SelectContent v-bind="$attrs" position="popper" :sideOffset="4" data-slot="select-content"
      :class="cn('z-[60] max-h-[min(18rem,var(--reka-select-content-available-height))] min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-lg border bg-background text-foreground shadow-md', props.class)">
      <SelectScrollUpButton class="flex h-6 items-center justify-center"><HugeiconsIcon :icon="ArrowUp01Icon" class="size-4" aria-hidden="true" /></SelectScrollUpButton>
      <SelectViewport class="p-1"><slot /></SelectViewport>
      <SelectScrollDownButton class="flex h-6 items-center justify-center"><HugeiconsIcon :icon="ArrowDown01Icon" class="size-4" aria-hidden="true" /></SelectScrollDownButton>
    </SelectContent>
  </SelectPortal>
</template>
