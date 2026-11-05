<script setup>
import { Toaster } from '@/components/ui/sonner';
import { RouterView } from 'vue-router';
import { ConfigProvider } from 'reka-ui';
</script>

<template>
  <!-- The stable scrollbar gutter in base.css already reserves scrollbar space. -->
  <ConfigProvider :scroll-body="{ padding: 0, margin: 0 }">
    <RouterView />
    <Toaster />
  </ConfigProvider>
</template>
