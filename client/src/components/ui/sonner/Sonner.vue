<script setup>
import postcard from './postcard.svg';
import { Toaster } from 'vue-sonner';
import { HugeiconsIcon } from '@hugeicons/vue';
import { CancelCircleIcon, CheckmarkCircle02Icon, InformationCircleIcon, Loading03Icon } from '@hugeicons/core-free-icons';
</script>

<template>
  <Toaster position="top-center" :duration="1000" :mobileOffset="10" class="lavenderToaster" :style="{ '--postcard-art': `url(${postcard})` }">
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
/*@1ejun6 > shared lavender postcard > existing toast messages &&& actions stay unchanged */
.lavenderToaster [data-sonner-toast][data-styled='true'] {
  --stripe-color: #bcb8ff;
  --stamp-size: 50px;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) var(--stamp-size);
  gap: .625rem;
  padding: .625rem;
  border: 5px solid transparent;
  border-radius: var(--radius-lg);
  background: linear-gradient(var(--background), var(--background)) padding-box,
    repeating-linear-gradient(135deg, var(--stripe-color) 0 10px, var(--background) 10px 20px, var(--border) 20px 30px, var(--background) 30px 40px) border-box;
  color: var(--foreground);
  font-family: var(--font-body);
  font-size: .875rem;
  box-shadow: none;
  box-sizing: border-box;
  max-width: 100%;

  /*@1ejun6 > success uses green stripes &&& error uses rose > other types keep lavender */
  &[data-type='success'] {
    --stripe-color: var(--toast-success-stripe);
  }

  &[data-type='error'] {
    --stripe-color: var(--toast-error-stripe);
  }

  &::before {
    content: '';
    grid-column: 3;
    grid-row: 1;
    width: var(--stamp-size);
    height: var(--stamp-size);
    align-self: start;
    background: var(--postcard-art) center / contain no-repeat;
  }

  & [data-icon] {
    grid-column: 1;
    grid-row: 1;
    width: 20px;
    height: 20px;
    margin: 0;
    align-self: center;
  }

  & [data-content] {
    grid-column: 2;
    grid-row: 1;
    gap: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  & [data-description] {
    color: var(--muted-foreground);
  }

  & [data-button] {
    grid-column: 2;
    justify-self: start;
    margin: 0;
    max-width: 100%;
    height: auto;
    min-height: 24px;
    white-space: normal;
  }

  /*@1ejun6 > smaller stamp leaves room for messages on narrow mobile screens */
  @media (max-width: 420px) {
    --stamp-size: 35px;
  }
}
</style>
