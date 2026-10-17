<script setup>
import { reactiveOmit } from "@vueuse/core";
import { DialogTitle, useForwardProps } from "reka-ui";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, default: 'h1' },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, "class");

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <DialogTitle data-slot="dialog-title" v-bind="forwardedProps" :class="props.class">
    <slot />
  </DialogTitle>
</template>
