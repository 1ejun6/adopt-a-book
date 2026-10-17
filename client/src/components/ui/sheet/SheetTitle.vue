<script setup>
import { reactiveOmit } from "@vueuse/core";
import { DialogTitle } from "reka-ui";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
  <DialogTitle
    data-slot="sheet-title"
    :class="props.class"
    v-bind="delegatedProps"
  >
    <slot />
  </DialogTitle>
</template>
