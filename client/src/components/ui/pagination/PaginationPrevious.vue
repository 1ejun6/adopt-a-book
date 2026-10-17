<script setup>
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { reactiveOmit } from "@vueuse/core";
import { PaginationPrev, useForwardProps } from "reka-ui";

const props = defineProps({
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <PaginationPrev data-slot="pagination-previous"
    class="washi-tape washi-tape-hover inline-flex shrink-0 items-center justify-center rounded-lg p-2.5 disabled:pointer-events-none" :class="props.class"
    v-bind="forwarded">
    <slot>
      <HugeiconsIcon :icon="ArrowLeft01Icon" class="size-4" aria-hidden="true" />
    </slot>
  </PaginationPrev>
</template>
