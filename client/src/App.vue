<script setup>
import { Toaster } from '@/components/ui/sonner';
import 'vue-sonner/style.css';
import { RouterView } from 'vue-router';
</script>

<template>
  <RouterView />
  <Toaster />
</template>
