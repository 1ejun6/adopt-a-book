<script setup>
import { Button } from '@/components/ui/button';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import AppPage from '@/components/shared/AppPage.vue';
const auth = useAuthStore();
</script>

<template>
  <AppPage class="space-y-4 text-center">
    <h1 class="text-4xl">Page not found</h1>
    <Button asChild variant="outline"><RouterLink :to="auth.homeRoute" class="">Return home</RouterLink></Button>
  </AppPage>
</template>
