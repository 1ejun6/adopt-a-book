<script setup>
//@1ejun6 > clickable button that opens ||| closes its matching dropdown
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { reactiveOmit } from "@vueuse/core";
import { NavigationMenuTrigger, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";
//@1ejun6 > reusable cva() function that returns the trigger base tailwind classes
import { navigationMenuTriggerStyle } from ".";

const props = defineProps({ //@1ejun6 > optional inputs from parent
  disabled: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, "class"); //@1ejun6 > keep ~class~ so it can be merged with default trigger styles
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <NavigationMenuTrigger data-slot="navigation-menu-trigger" v-bind="forwardedProps"
    :class="cn(navigationMenuTriggerStyle(), 'group', props.class)">
    <!--@1ejun6 > trigger label-->
    <slot />
    <HugeiconsIcon :icon="ArrowDown01Icon"
      class="relative top-px ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
      aria-hidden="true" />
  </NavigationMenuTrigger>
</template>
