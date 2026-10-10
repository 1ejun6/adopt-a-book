<script setup>
//j > outer container > manages which dropdown is open
import { reactiveOmit } from "@vueuse/core";
import { NavigationMenuRoot, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";
import NavigationMenuViewport from "./NavigationMenuViewport.vue";

const props = defineProps({ //j > declares values a parent may pass into this vue component
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
const emits = defineEmits(["update:modelValue"]); //j > declares events this component can send back to its parent

//j > keep ~class~ &&& ~viewport~ here because this wrapper handles them itself
const delegatedProps = reactiveOmit(props, "class", "viewport"); //j > creates a reactive props object without fields this wrapper handles itself > usually class
const forwarded = useForwardPropsEmits(delegatedProps, emits); //j > forwards both props &&& events
</script>

<template>
  <NavigationMenuRoot v-slot="slotProps" data-slot="navigation-menu" :data-viewport="viewport" v-bind="forwarded"
    :class="cn(
      'group/navigation-menu relative flex max-w-max flex-1 items-center justify-center',
      props.class,
    )
      ">
    <slot v-bind="slotProps" /> <!--j > slot is where parent places menu items inside this component-->
    <NavigationMenuViewport v-if="viewport" />
  </NavigationMenuRoot>
</template>
