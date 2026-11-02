<script setup>
import { Toaster } from 'vue-sonner';
import { HugeiconsIcon } from '@hugeicons/vue';
import { Cancel01Icon, CancelCircleIcon, CheckmarkCircle02Icon, InformationCircleIcon, Loading03Icon } from '@hugeicons/core-free-icons';
</script>

<template>
  <Toaster position="top-center" :duration="1000" close-button :mobileOffset="10" class="quietToaster">
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
/*@1ejun6 > shared quiet card > keep messages & actions in one layout */
.quietToaster [data-sonner-toast][data-styled='true'] {
  display: grid;
  grid-template-columns: 20px repeat(2, minmax(0, 1fr));
  gap: .625rem;
  padding: 1.25rem;
  background: var(--background);
  color: var(--foreground);
  border-color: var(--border);
  font-family: var(--font-body);

  & [data-icon] { grid-column: 1; grid-row: 1; margin: 0; }
  & [data-content] { grid-column: 2 / -1; min-width: 0; padding-right: 1.25rem; overflow-wrap: anywhere; }
  & [data-description] { color: var(--muted-foreground); }

  /*@1ejun6 > equal auth buttons share one row > centre labels */
  & [data-button] {
    grid-row: 2;
    justify-content: center;
    margin: 0;
    min-height: 36px;
    background: var(--primary);
    color: inherit;
    white-space: normal;
  }
  & [data-cancel] { grid-column: 2; background: transparent; }
  & [data-action] { grid-column: 3; }
  & [data-close-button] {
    top: .625rem;
    right: .625rem;
    left: auto;
    transform: none;
    background: var(--background);
    border-color: var(--border);
    color: inherit;
  }
}
</style>
