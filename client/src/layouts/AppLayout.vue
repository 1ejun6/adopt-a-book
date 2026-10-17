<script setup>
import { RouterView } from 'vue-router';
import AppNavbar from '@/components/shared/AppNavbar.vue';
</script>

<template>
  <div class="flex min-h-screen flex-col"> <!--@1ejun6 > as tall as browser screen > navbar on top &&& main below-->
    <AppNavbar />
    <main class="flex flex-1 p-5"> <!--@1ejun6 > empty space left after navbar-->
      <RouterView />
    </main>
  </div>
</template>
