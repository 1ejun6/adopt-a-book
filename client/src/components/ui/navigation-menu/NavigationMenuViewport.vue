<script setup>
//j > positioned container that displays whichever dropdown is currently open
import { reactiveOmit } from "@vueuse/core";
import { NavigationMenuViewport, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps({
  forceMount: { type: Boolean, required: false },
  align: { type: String, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

//j > reka ui receives its props > this wrapper combines css classes itself
const delegatedProps = reactiveOmit(props, "class");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <!--j > displays dropdown below menu without affecting page layout-->
  <div class="absolute top-full left-0 isolate z-50 flex justify-center">
    <NavigationMenuViewport data-slot="navigation-menu-viewport" v-bind="forwardedProps" :class="cn(
      'origin-top-center bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 relative mt-1.5 h-(--reka-navigation-menu-viewport-height) w-full overflow-hidden rounded-md border shadow md:w-(--reka-navigation-menu-viewport-width) left-(--reka-navigation-menu-viewport-left)',
      props.class,
    )
      " />
  </div>
</template>
