<script setup>
import { RouterView } from 'vue-router';
import GuestCustomerNavbar from '@/components/GuestCustomerNavbar.vue'
</script>

<template>
    <div class="flex min-h-screen flex-col"> <!--j > as tall as browser screen > navbar on top &&& main below-->
  <GuestCustomerNavbar />
    <main class="flex flex-1 p-5"> <!--j > empty space left after navbar-->
    <RouterView />
  </main>
  </div>
</template>
