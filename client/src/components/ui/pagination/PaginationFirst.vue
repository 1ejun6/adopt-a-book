<script setup>
import { reactiveOmit } from "@vueuse/core";
import { PaginationFirst, useForwardProps } from "reka-ui";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <PaginationFirst data-slot="pagination-first" class="washi-tape-hover min-h-11 min-w-11 rounded-lg p-2" :class="props.class"
    v-bind="forwarded">
    <slot>
      <span>First</span>
    </slot>
  </PaginationFirst>
</template>
