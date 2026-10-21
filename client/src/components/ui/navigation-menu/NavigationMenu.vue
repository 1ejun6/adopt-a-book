<script setup>
//@1ejun6 > outer container > manages which dropdown is open
import { reactiveOmit } from '@vueuse/core';
import { NavigationMenuRoot, useForwardPropsEmits } from 'reka-ui';
import { cn } from '@/lib/utils';
import NavigationMenuViewport from './NavigationMenuViewport.vue';

const props = defineProps({ //@1ejun6 > declares values a parent may pass into this vue component
  modelValue: { type: String, required: false },
  defaultValue: { type: String, required: false },
  dir: { type: String, required: false },
  orientation: { type: String, required: false },
  delayDuration: { type: Number, required: false },
  skipDelayDuration: { type: Number, required: false },
  disableClickTrigger: { type: Boolean, required: false },
  disableHoverTrigger: { type: Boolean, required: false },
  disablePointerLeaveClose: { type: Boolean, required: false },
  unmountOnHide: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
  viewport: { type: Boolean, required: false, default: true },
});
const emits = defineEmits(['update:modelValue']); //@1ejun6 > declares events this component can send back to its parent

//@1ejun6 > keep ~class~ & ~viewport~ here because this wrapper handles them itself
const delegatedProps = reactiveOmit(props, 'class', 'viewport'); //@1ejun6 > creates a reactive props object without fields this wrapper handles itself > usually class
const forwarded = useForwardPropsEmits(delegatedProps, emits); //@1ejun6 > forwards both props & events
</script>

<template>
  <NavigationMenuRoot v-slot="slotProps" data-slot="navigation-menu" :data-viewport="viewport" v-bind="forwarded"
    :class="cn('group/navigation-menu relative flex flex-1 items-center', props.class)"> <!-- @1ejun6 > element as a group > grow & shrink to share available space inside a flex parent-->
    <slot v-bind="slotProps" /> <!--@1ejun6 > slot is where parent places menu items inside this component-->
    <NavigationMenuViewport v-if="viewport" />
  </NavigationMenuRoot>
</template>
