<script setup>
import { ArrowLeftDoubleIcon } from "@hugeicons/core-free-icons";
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
  <PaginationFirst aria-label="First page" data-slot="pagination-first" class="hover:bg-primary data-[active]:bg-primary min-h-11 min-w-11 rounded-lg p-2" :class="props.class"
    v-bind="forwarded">
    <slot>
      <HugeiconsIcon :icon="ArrowLeftDoubleIcon" class="size-4" aria-hidden="true" />
    </slot>
  </PaginationFirst>
</template>
