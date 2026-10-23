<script setup>
//@1ejun6 > renders a styled input with vue model binding
import { useVModel } from '@vueuse/core';
import { cn } from '@/lib/utils';

const props = defineProps({
  defaultValue: { type: [String, Number], required: false },
  modelValue: { type: [String, Number], required: false },
  class: { type: null, required: false },
});

const emits = defineEmits(['update:modelValue']);

const modelValue = useVModel(props, 'modelValue', emits, {
  passive: true,
  defaultValue: props.defaultValue,
});
</script>

<template>
  <input v-model="modelValue" data-slot="input" :class="cn(
    'h-9 w-full min-w-0 rounded-lg border bg-background px-3 text-base placeholder:text-muted-foreground transition-colors hover:border-muted-foreground focus-visible:border-foreground md:text-sm',
    props.class,
  )
    " />
</template>
