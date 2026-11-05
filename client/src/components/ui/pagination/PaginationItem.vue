<script setup>
import { reactiveOmit } from "@vueuse/core";
import { PaginationListItem } from "reka-ui";

const props = defineProps({
  value: { type: Number, required: true },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
  isActive: { type: Boolean, required: false },
});

const delegatedProps = reactiveOmit(props, "class", "isActive");
</script>

<template>
  <PaginationListItem data-slot="pagination-item" v-bind="delegatedProps" class="hover:bg-primary data-[active]:bg-primary min-h-11 min-w-11 rounded-lg p-2"
    :class="[{ 'bg-primary': isActive }, props.class]">
    <slot />
  </PaginationListItem>
</template>
