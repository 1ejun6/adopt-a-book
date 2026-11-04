<script setup>
//@1ejun6 > clickable button that opens \ closes its matching dropdown
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { reactiveOmit } from '@vueuse/core';
import { NavigationMenuTrigger, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
  //@1ejun6 > optional inputs from parent
  disabled: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, 'class'); //@1ejun6 > keep ~class~ so it can be merged with default trigger styles
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <NavigationMenuTrigger data-slot="navigation-menu-trigger" v-bind="forwardedProps"
    :class="cn('washi-tape-hover rounded-lg p-2.5 text-sm', props.class)">
    <!--@1ejun6 > trigger label-->
    <slot />
    <HugeiconsIcon :icon="ArrowDown01Icon" class="ml-1 size-3" aria-hidden="true" />
  </NavigationMenuTrigger>
</template>
