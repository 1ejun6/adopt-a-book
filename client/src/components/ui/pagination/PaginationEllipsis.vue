<script setup>
import { reactiveOmit } from "@vueuse/core";
import { PaginationEllipsis } from "reka-ui";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, "class");
</script>

<template>
  <PaginationEllipsis data-slot="pagination-ellipsis" v-bind="delegatedProps" :class="props.class">
    <slot>
      <span aria-hidden="true">…</span>
      <span class="sr-only">More pages</span>
    </slot>
  </PaginationEllipsis>
</template>
