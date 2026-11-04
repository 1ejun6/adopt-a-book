<script setup>
//@1ejun6 > groups a form control with its label & related content
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <div
    role="group"
    data-slot="field"
    :class="cn('flex flex-col gap-2.5', props.class)"
  >
    <slot />
  </div>
</template>
