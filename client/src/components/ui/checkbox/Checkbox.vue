<script setup>
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { reactiveOmit } from "@vueuse/core";
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps({
  defaultValue: { type: null, required: false },
  modelValue: { type: null, required: false },
  disabled: { type: Boolean, required: false },
  value: { type: null, required: false },
  id: { type: String, required: false },
  trueValue: { type: null, required: false },
  falseValue: { type: null, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  name: { type: String, required: false },
  required: { type: Boolean, required: false },
  class: { type: null, required: false },
});
const emits = defineEmits(["update:modelValue"]);

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <!-- lee-hlmilk > changed shadcn defaults to size-4.5, rounded corners and card background to match original table checkboxes, checked and indeterminate states use our main.css -->
  <CheckboxRoot
    v-slot="slotProps"
    data-slot="checkbox"
    v-bind="forwarded"
    :class="
      cn(
        'peer border-input data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=indeterminate]:bg-foreground data-[state=indeterminate]:text-background focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4.5 shrink-0 rounded bg-card border shadow-xs transition-shadow outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
  >
    <CheckboxIndicator
      data-slot="checkbox-indicator"
      class="grid place-content-center text-current transition-none"
    >
      <slot v-bind="slotProps">
        <!-- lee-hlmilk > added dash for partial selection and render tick through HugeiconsIcon, shared checkbox handles both symbols so table does not repeat indicator markup -->
        <span v-if="slotProps.state === 'indeterminate'" class="h-0.5 w-2.5 rounded-full bg-current"></span>
        <HugeiconsIcon v-else :icon="Tick02Icon" class="size-3.5" aria-hidden="true"></HugeiconsIcon>
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
