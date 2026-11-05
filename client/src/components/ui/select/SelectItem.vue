<script setup>
import { SelectItem, SelectItemText, SelectItemIndicator } from 'reka-ui';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

defineOptions({ inheritAttrs: false });
const props = defineProps({ value: { type: String, required: true }, disabled: Boolean, class: { type: null, default: null } });
</script>

<template>
  <SelectItem v-bind="$attrs" :value="props.value" :disabled="props.disabled" data-slot="select-item"
    :class="cn('relative flex min-h-11 cursor-default select-none items-center rounded-md py-2 pl-3 pr-9 text-sm outline-none data-[highlighted]:bg-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-40', props.class)">
    <SelectItemText><slot /></SelectItemText>
    <SelectItemIndicator class="absolute right-3 flex items-center"><HugeiconsIcon :icon="Tick02Icon" class="size-4 text-success-foreground" aria-hidden="true" /></SelectItemIndicator>
  </SelectItem>
</template>
