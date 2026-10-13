<script setup>
//@1ejun6 > groups a form control with its label &&& related content
import { cn } from "@/lib/utils";
import { fieldVariants } from ".";

const props = defineProps({
  class: { type: null, required: false },
  orientation: { type: null, required: false },
});
</script>

<template>
  <div
    role="group"
    data-slot="field"
    :data-orientation="orientation"
    :class="cn(fieldVariants({ orientation }), props.class)"
  >
    <slot />
  </div>
</template>
