<script setup>
//@1ejun6 > renders an accessible label for a form control
import { reactiveOmit } from '@vueuse/core';
import { Label } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
  for: { type: String, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <Label data-slot="label" v-bind="delegatedProps"
    :class="cn('text-sm', props.class)">
    <slot />
  </Label>
</template>
