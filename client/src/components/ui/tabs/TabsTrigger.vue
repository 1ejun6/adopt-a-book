<script setup>
import { reactiveOmit } from '@vueuse/core';
import { TabsTrigger, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
  value: { type: [String, Number], required: true },
  disabled: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, 'class');

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <TabsTrigger data-slot="tabs-trigger" :class="cn(
    'inline-flex items-center p-2.5 text-sm',
    props.class,
  )
    " v-bind="forwardedProps">
    <slot />
  </TabsTrigger>
</template>
