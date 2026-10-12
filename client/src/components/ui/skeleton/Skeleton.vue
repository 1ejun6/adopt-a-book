<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <!-- lee-hlmilk > bg-border/60 instead of default bg-primary/10 for visible pulse anim-->
  <div
    data-slot="skeleton"
    :class="cn('animate-pulse rounded-md bg-border/60', props.class)"
  />
</template>
