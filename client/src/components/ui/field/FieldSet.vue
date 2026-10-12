<script setup>
//@1ejun6 > groups related form fields in a fieldset
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <fieldset data-slot="field-set" :class="cn(
    'flex flex-col gap-6',
    'has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
    props.class,
  )
    ">
    <slot />
  </fieldset>
</template>
