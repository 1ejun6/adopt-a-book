<script setup>
import { reactiveOmit } from "@vueuse/core";
import { DialogDescription, useForwardProps } from "reka-ui";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, default: 'p' },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, "class");

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <DialogDescription data-slot="dialog-description" v-bind="forwardedProps" :class="props.class">
    <slot />
  </DialogDescription>
</template>
