<script setup>
import { Toaster } from 'vue-sonner';
import { HugeiconsIcon } from '@hugeicons/vue';
import { CancelCircleIcon, CheckmarkCircle02Icon, InformationCircleIcon, Loading03Icon } from '@hugeicons/core-free-icons';
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
    <!--@1ejun6 > toast.promise uses loading while pending > success when resolved ||| error when rejected-->
    <template #loading-icon>
      <HugeiconsIcon :icon="Loading03Icon" :size="20" class="animate-spin" />
    </template>
  </Toaster>
</template>

<style>
/*@1ejun6 > shared quiet card > keep messages & actions in one layout */
.quietToaster [data-sonner-toast][data-styled='true'] {
  display: grid;
  grid-template-columns: 30px repeat(2, minmax(0, 1fr));
  gap: .625rem;
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-body);
  box-shadow: 0 6px 22px #633b2210;

  & [data-icon] {
    grid-column: 1;
    grid-row: 1;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    margin: 0;
    border: 0;
    border-radius: 50%;
    background: var(--primary);
    color: #655985;
  }

  &[data-type='success'] [data-icon] {
    background: var(--success);
    color: var(--success-foreground);
  }

  &[data-type='error'] [data-icon] {
    background: var(--badge-rose);
    color: var(--destructive);
  }

  & [data-content] {
    grid-column: 2 / -1;
    grid-row: 1;
    align-self: center;
    min-width: 0;
    padding-right: 1.25rem;
    gap: 4px;
    border: 0;
    overflow-wrap: anywhere;
  }

  & [data-title] {
    border: 0;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.6;
  }

  & [data-description] {
    border: 0;
    color: var(--muted-foreground);
    font-size: 12px;
    line-height: 1.7;
  }

  /*@1ejun6 > equal auth buttons share one row > centre labels */
  & [data-button] {
    grid-row: 2;
    align-self: stretch;
    justify-content: center;
    margin: 0;
    height: auto;
    min-height: 36px;
    padding: 0 .625rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--primary);
    color: var(--foreground);
    font: inherit;
    text-align: center;
    white-space: normal;
  }

  & [data-cancel] { grid-column: 2; background: transparent; }
  & [data-action] { grid-column: 3; }

  & [data-close-button] {
    top: 10px;
    right: 10px;
    left: auto;
    transform: none;
    width: 24px;
    height: 24px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--muted-foreground);
  }

  & [data-close-button]:hover { background: var(--primary); }
  & svg { border: 0; }
}
</style>
