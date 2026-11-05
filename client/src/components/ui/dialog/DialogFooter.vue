<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { cn } from '@/lib/utils';
import { DialogClose } from "reka-ui";
import { Button } from '@/components/ui/button';

const props = defineProps({
  class: { type: null, required: false },
  showCloseButton: { type: Boolean, required: false, default: false },
});
</script>

<template>
  <div data-slot="dialog-footer" :class="cn('flex flex-wrap gap-2.5 border-t pt-5', props.class)
    ">
    <slot />
    <DialogClose v-if="showCloseButton" asChild>
      <Button variant="outline"><AppIcon name="close" /><span class="sr-only">Close</span></Button>
    </DialogClose>
  </div>
</template>
