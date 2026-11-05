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
      'fixed left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 m-auto h-fit w-auto max-w-3xl sm:max-w-4xl lg:max-w-5xl max-h-[calc(100dvh-max(1rem,env(safe-area-inset-top))-max(1rem,env(safe-area-inset-bottom)))] overflow-y-auto [overflow-wrap:anywhere] bg-background text-sm rounded-lg',
      props.class,
    )
      ">
      <slot />

      <DialogClose v-if="showCloseButton" data-slot="dialog-close" class="absolute top-3 right-3 flex min-h-11 min-w-11 items-center justify-center">
        <HugeiconsIcon :icon="Cancel01Icon" class="size-4" aria-hidden="true" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
