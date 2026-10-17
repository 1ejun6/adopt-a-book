<script setup>
import { reactiveOmit } from "@vueuse/core";
import { PaginationLast, useForwardProps } from "reka-ui";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <PaginationLast data-slot="pagination-last" class="washi-tape washi-tape-hover rounded-lg p-2.5 disabled:pointer-events-none" :class="props.class"
    v-bind="forwarded">
    <slot>
      <span>Last</span>
    </slot>
  </PaginationLast>
</template>
