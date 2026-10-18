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
import DialogOverlay from "./DialogOverlay.vue";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  forceMount: { type: Boolean, required: false },
  disableOutsidePointerEvents: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
  showCloseButton: { type: Boolean, required: false, default: true },
});
const emits = defineEmits([
  "escapeKeyDown",
  "pointerDownOutside",
  "focusOutside",
  "interactOutside",
  "openAutoFocus",
  "closeAutoFocus",
]);

const delegatedProps = reactiveOmit(props, "class", "showCloseButton");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
//@1ejun6 > clicking a Sonner toast should not dismiss the dialog behind it
function handleInteractOutside(event) {
  if (event.target instanceof Element && event.target.closest('[data-sonner-toaster]')) { event.preventDefault(); }
}
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent @interactOutside="handleInteractOutside" data-slot="dialog-content" v-bind="{ ...$attrs, ...forwarded }" :class="cn(
      'fixed inset-5 z-50 m-auto h-fit max-w-xl max-h-[calc(100dvh-2.5rem)] space-y-2.5 overflow-y-auto [overflow-wrap:anywhere] bg-background p-5 text-sm rounded-lg',
      props.class,
    )
      ">
      <slot />

      <DialogClose v-if="showCloseButton" data-slot="dialog-close" class="absolute top-5 right-5">
        <HugeiconsIcon :icon="Cancel01Icon" class="size-[1.875rem]" aria-hidden="true" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
