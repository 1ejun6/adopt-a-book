<script setup>
import { Toaster } from 'vue-sonner';
import { HugeiconsIcon } from '@hugeicons/vue';
import { Cancel01Icon, CancelCircleIcon, CheckmarkCircle02Icon, InformationCircleIcon, Loading03Icon } from '@hugeicons/core-free-icons';
</script>

<template>
  <Toaster position="top-center" :duration="4000" close-button :mobileOffset="10" class="quietToaster">
    <template #success-icon>
      <HugeiconsIcon :icon="CheckmarkCircle02Icon" :size="20" />
    </template>
    <template #info-icon>
      <HugeiconsIcon :icon="InformationCircleIcon" :size="20" />
    </template>
    <template #error-icon>
      <HugeiconsIcon :icon="CancelCircleIcon" :size="20" />
    </template>
    <template #close-icon>
      <HugeiconsIcon :icon="Cancel01Icon" :size="20" />
    </template>
    <!--@1ejun6 > toast.promise uses loading while pending > success when resolved ||| error when rejected-->
    <template #loading-icon>
      <HugeiconsIcon :icon="Loading03Icon" :size="20" />
    </template>
  </Toaster>
</template>

<style>
.quietToaster {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  width: min(400px, calc(100% - 24px));
  display: grid;
  gap: 10px;
}
.quietToaster [data-sonner-toast] { position: relative; }
.quietToaster [data-visible='false'],
.quietToaster [data-removed='true'] { display: none; }
.quietToaster [data-styled='true'] {
  display: grid;
  grid-template-columns: 20px repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--background);
  font-size: 14px;
}
.quietToaster [data-icon] { grid-column: 1; grid-row: 1; }
.quietToaster [data-content] { grid-column: 2 / -1; padding-right: 24px; overflow-wrap: anywhere; }
.quietToaster [data-description] { color: var(--muted-foreground); }
.quietToaster [data-button] { grid-row: 2; min-height: 44px; padding: 8px; border-radius: 8px; background: var(--primary); }
.quietToaster [data-cancel] { grid-column: 2; background: transparent; }
.quietToaster [data-action] { grid-column: 3; }
.quietToaster [data-close-button] { position: absolute; top: 0; right: 0; display: grid; place-items: center; width: 44px; height: 44px; }
</style>
