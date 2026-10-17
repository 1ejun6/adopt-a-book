<script setup>
import { Toaster } from 'vue-sonner';
import { HugeiconsIcon } from '@hugeicons/vue';
import { AlertCircleIcon, CancelCircleIcon, CheckmarkCircle02Icon, InformationCircleIcon, Loading03Icon } from '@hugeicons/core-free-icons';
</script>

<template>
  <Toaster :toastOptions="{ style: { boxShadow: 'none' } }" :style="{ '--normal-bg': 'var(--primary)', '--normal-text': 'var(--foreground)', '--normal-border': 'var(--border)', '--border-radius': 'var(--radius-lg)' }">
    <template #success-icon><HugeiconsIcon :icon="CheckmarkCircle02Icon" :size="20" /></template>
    <template #info-icon><HugeiconsIcon :icon="InformationCircleIcon" :size="20" /></template>
    <template #warning-icon><HugeiconsIcon :icon="AlertCircleIcon" :size="20" /></template>
    <template #error-icon><HugeiconsIcon :icon="CancelCircleIcon" :size="20" /></template>
    <!--@1ejun6 > toast.promise uses loading while pending > success when resolved ||| error when rejected-->
    <template #loading-icon><HugeiconsIcon :icon="Loading03Icon" :size="20" class="animate-spin" /></template>
  </Toaster>
</template>
