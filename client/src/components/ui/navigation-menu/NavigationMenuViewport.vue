<script setup>
//@1ejun6 > positioned container that displays whichever dropdown is currently open
import { reactiveOmit } from '@vueuse/core';
import { NavigationMenuViewport, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
  forceMount: { type: Boolean, required: false },
  align: { type: String, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

//@1ejun6 > reka ui receives its props > this wrapper combines css classes itself
const delegatedProps = reactiveOmit(props, 'class');
const forwardedProps = useForwardProps(delegatedProps);
</script>

<!--@1ejun6 > reka supplies css variables for active dropdown dimensions & position-->
<template>
  <!--@1ejun6 > displays dropdown below menu without affecting page layout-->
  <div class="absolute top-full left-0 isolate z-50 flex justify-center">
    <NavigationMenuViewport data-slot="navigation-menu-viewport" v-bind="forwardedProps" :class="cn(
      'relative h-(--reka-navigation-menu-viewport-height) w-(--reka-navigation-menu-viewport-width) rounded-lg border bg-card',
      props.class,
    )
      " />
  </div>
</template>
