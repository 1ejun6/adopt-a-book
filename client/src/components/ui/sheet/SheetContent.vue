<script setup>
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { reactiveOmit } from "@vueuse/core";
import { cn } from '@/lib/utils';
import {
  DialogClose,
  DialogContent,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui";
import SheetOverlay from "./SheetOverlay.vue";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  class: { type: null, required: false },
  side: { type: String, required: false, default: "right" },
  forceMount: { type: Boolean, required: false },
  disableOutsidePointerEvents: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
});
const emits = defineEmits([
  "escapeKeyDown",
  "pointerDownOutside",
  "focusOutside",
  "interactOutside",
  "openAutoFocus",
  "closeAutoFocus",
]);

const delegatedProps = reactiveOmit(props, "class", "side");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <DialogPortal>
    <SheetOverlay />
    <DialogContent
      data-slot="sheet-content"
      :class="
        cn(
          'fixed z-50 flex flex-col gap-2.5 overflow-y-auto bg-background p-5',
          side === 'right' && 'inset-y-0 right-0 w-3/4 sm:max-w-sm',
          side === 'left' && 'inset-y-0 left-0 w-3/4 sm:max-w-sm',
          side === 'top' && 'inset-x-0 top-0',
          side === 'bottom' && 'inset-x-0 bottom-0',
          props.class,
        )
      "
      v-bind="{ ...$attrs, ...forwarded }"
    >
      <slot />

      <DialogClose class="absolute top-2.5 right-2.5">
        <HugeiconsIcon :icon="Cancel01Icon" class="size-4" aria-hidden="true" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
