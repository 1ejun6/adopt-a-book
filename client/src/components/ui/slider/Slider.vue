<script setup>
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useForwardPropsEmits } from "reka-ui";

const props = defineProps({
  defaultValue: { type: Array, required: false },
  modelValue: { type: [Array, null], required: false },
  disabled: { type: Boolean, required: false },
  orientation: { type: String, required: false },
  dir: { type: String, required: false },
  inverted: { type: Boolean, required: false },
  min: { type: Number, required: false },
  max: { type: Number, required: false },
  step: { type: Number, required: false },
  minStepsBetweenThumbs: { type: Number, required: false },
  thumbAlignment: { type: String, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  name: { type: String, required: false },
  required: { type: Boolean, required: false },
});
const emits = defineEmits(["update:modelValue", "valueCommit"]);

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <SliderRoot v-slot="{ modelValue }" data-slot="slider" v-bind="forwarded"
    class="relative flex h-11 items-center">
    <SliderTrack data-slot="slider-track" class="bg-border relative h-2 grow"> <!--@1ejun6 > grow makes track fill available width-->
      <SliderRange data-slot="slider-range" class="bg-primary absolute h-full" />
    </SliderTrack>

    <SliderThumb v-for="(_, key) in modelValue" :key="key" data-slot="slider-thumb"
      class="bg-foreground size-5 rounded-full" />
  </SliderRoot>
</template>
