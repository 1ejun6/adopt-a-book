<script setup>
import { MinusSignIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { reactiveOmit } from '@vueuse/core';
import { CheckboxIndicator, CheckboxRoot, useForwardPropsEmits } from 'reka-ui';
import { cn } from '@/lib/utils';

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

const emits = defineEmits(['update:modelValue']);
const delegatedProps = reactiveOmit(props, 'class');
const forwarded = useForwardPropsEmits(delegatedProps, emits);

//@1ejun6 > indeterminate is from reka ui > partially checked > some visible rows selected
</script>

<template>
  <!--@lee-hlmilk > changed shadcn defaults to size-4.5 > rounded-lg corners &&& card background to match original table checkboxes > checked &&& indeterminate states use our main.css -->
  <CheckboxRoot v-slot="slotProps" data-slot="checkbox" v-bind="forwarded" :class="cn(
    'size-4.5 rounded-lg border border-foreground bg-foreground text-background data-[state=unchecked]:bg-card',
    props.class,
  )
    ">
    <CheckboxIndicator data-slot="checkbox-indicator" class="grid place-content-center">
      <slot v-bind="slotProps">
        <!--@lee-hlmilk > added dash for partial selection &&& render tick through hugeiconsicon > shared checkbox handles both symbols so table does not repeat indicator markup-->
        <HugeiconsIcon v-if="slotProps.state === 'indeterminate'" :icon="MinusSignIcon" class="size-3.5"
          aria-hidden="true"></HugeiconsIcon> <!--@1ejun6 > highest check box is dash icon-->
        <HugeiconsIcon v-else :icon="Tick02Icon" class="size-3.5" aria-hidden="true"></HugeiconsIcon> <!--@1ejun6 > highest check box is tick icon-->
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
