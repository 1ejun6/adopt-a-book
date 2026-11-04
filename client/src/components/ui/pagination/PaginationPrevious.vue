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
    class="washi-tape-hover grid min-h-11 min-w-11 place-items-center rounded-lg p-2" :class="props.class"
    v-bind="forwarded">
    <slot>
      <HugeiconsIcon :icon="ArrowLeft01Icon" class="size-4" aria-hidden="true" />
    </slot>
  </PaginationPrev>
</template>
