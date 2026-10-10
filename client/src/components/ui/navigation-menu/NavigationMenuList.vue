<script setup>
//j > horizontal row that holds all menu items
import { reactiveOmit } from "@vueuse/core";
import { NavigationMenuList, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

//j > remove ~class~ before forwarding props because ~cn()~ handles it below
const delegatedProps = reactiveOmit(props, "class");
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <NavigationMenuList data-slot="navigation-menu-list" v-bind="forwardedProps" :class="cn(
    'group flex flex-1 list-none items-center justify-center gap-1',
    props.class,
  )
    ">
    <slot />
  </NavigationMenuList>
</template>
