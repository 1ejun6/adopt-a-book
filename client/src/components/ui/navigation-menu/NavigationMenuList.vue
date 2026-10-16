<script setup>
//@1ejun6 > horizontal row that holds all menu items
import { reactiveOmit } from '@vueuse/core';
import { NavigationMenuList, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

//@1ejun6 > remove ~class~ before forwarding props because ~cn()~ handles it below
const delegatedProps = reactiveOmit(props, 'class');
const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <NavigationMenuList data-slot="navigation-menu-list" v-bind="forwardedProps"
    :class="cn('flex flex-1 items-center gap-2.5', props.class)">
    <slot />
  </NavigationMenuList>
</template>
