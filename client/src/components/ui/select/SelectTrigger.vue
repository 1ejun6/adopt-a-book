<script setup>
import { SelectTrigger, SelectIcon } from 'reka-ui';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

defineOptions({ inheritAttrs: false });
const props = defineProps({ class: { type: null, default: null } });
</script>

<template>
  <SelectTrigger v-bind="$attrs" data-slot="select-trigger"
    :class="cn('flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-left text-base data-[placeholder]:text-muted-foreground [&>span]:truncate', props.class)">
    <slot />
    <SelectIcon asChild><HugeiconsIcon :icon="ArrowDown01Icon" class="size-4 shrink-0" aria-hidden="true" /></SelectIcon>
  </SelectTrigger>
</template>
