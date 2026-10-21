<script setup>
//@1ejun6 > dropdown box that appears under a navbar item
import { reactiveOmit } from '@vueuse/core';
import { NavigationMenuContent, useForwardPropsEmits } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
  forceMount: { type: Boolean, required: false },
  disableOutsidePointerEvents: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});
const emits = defineEmits([ //@1ejun6 >  dropdown component is allowed to tell its parent when these four things happen > escape & click outside of dropdown & keyboard focus leave dropdown & interacts outside it
  "escapeKeyDown",
  "pointerDownOutside",
  "focusOutside",
  "interactOutside",
]);

const delegatedProps = reactiveOmit(props, 'class'); //@1ejun6 > ~class~ is combined below with components base tailwind classes
const forwarded = useForwardPropsEmits(delegatedProps, emits); //@1ejun6 > vue wrapper component pass its props & emitted events through to component inside it
</script>

<!--@1ejun6 > without a shared viewport > content is positioned & styled as its own dropdown panel-->
<template>
  <NavigationMenuContent data-slot="navigation-menu-content" v-bind="forwarded" :class="cn(
    'absolute left-0 top-0 rounded-lg border bg-card p-2 group-data-[viewport=false]/navigation-menu:top-full',
    props.class,
  )
    ">
    <!--@1ejun6 > dropdown links & other content are inserted here-->
    <slot />
  </NavigationMenuContent>
</template>
