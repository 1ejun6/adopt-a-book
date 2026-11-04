<script setup>
//@1ejun6 > styled link inside top menu \ dropdown
import { reactiveOmit } from '@vueuse/core';
import { NavigationMenuLink, useForwardPropsEmits } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
  active: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});
const emits = defineEmits(['select']);

const delegatedProps = reactiveOmit(props, 'class'); //@1ejun6 > ~active~ & ~as~ & ~aschild~ go to reka ui > ~class~ is merged locally
const forwarded = useForwardPropsEmits(delegatedProps, emits); //@1ejun6 > forwards remaining props & events to child component
</script>

<template>
  <NavigationMenuLink data-slot="navigation-menu-link" v-bind="forwarded"
    :class="cn('washi-tape washi-tape-hover block rounded-lg p-2 text-sm', props.class)">
    <slot />
  </NavigationMenuLink>
</template>
