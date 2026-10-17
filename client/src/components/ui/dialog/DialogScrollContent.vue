<script setup>
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { reactiveOmit } from "@vueuse/core";
import { cn } from '@/lib/utils';
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  forceMount: { type: Boolean, required: false },
  disableOutsidePointerEvents: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});
const emits = defineEmits([
  "escapeKeyDown",
  "pointerDownOutside",
  "focusOutside",
  "interactOutside",
  "openAutoFocus",
  "closeAutoFocus",
]);

const delegatedProps = reactiveOmit(props, "class");

const forwarded = useForwardPropsEmits(delegatedProps, emits);
//@1ejun6 > clicking a Sonner toast should not dismiss the dialog behind it
function handleInteractOutside(event) {
  if (event.target instanceof Element && event.target.closest('[data-sonner-toaster]')) { event.preventDefault(); }
}
</script>

<template>
  <DialogPortal>
    <DialogOverlay class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-5">
      <DialogContent @interactOutside="handleInteractOutside" :class="cn(
        'relative w-full max-w-xl space-y-2.5 bg-background p-5 text-sm rounded-lg',
        props.class,
      )
        " v-bind="{ ...$attrs, ...forwarded }" @pointerDownOutside="
          (event) => {
            const originalEvent = event.detail.originalEvent;
            const target = originalEvent.target;
            if (
              originalEvent.offsetX > target.clientWidth ||
              originalEvent.offsetY > target.clientHeight
            ) {
              event.preventDefault();
            }
          }
        ">
        <slot />

        <DialogClose class="absolute top-5 right-5">
          <HugeiconsIcon :icon="Cancel01Icon" class="size-[1.875rem]" aria-hidden="true" />
          <span class="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </DialogOverlay>
  </DialogPortal>
</template>
