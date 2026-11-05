<script setup>
import { computed, ref, watch } from 'vue';
import { onKeyStroke } from '@vueuse/core';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { pages } from '@/router';
import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();
const { role, homeRoute, logoutLoading } = storeToRefs(auth);
import { toast } from 'vue-sonner';
import bow from '@/assets/bow.svg';
import { Cancel01Icon, Menu01Icon } from '@hugeicons/core-free-icons';
import AppNavbarLinks from './AppNavbarLinks.vue';

const router = useRouter();
const route = useRoute();
//@1ejun6 > get routes > wait for session check > keep labelled pages allowed for current role
//@1ejun6 > computed updates this list when session \ role changes > page labels & roles are defined in ~router/index.js~
const links = computed(() => pages.filter((page) => (auth.ready || auth.error) && page.label && page.meta?.roles?.includes(role.value)));

const status = ref(false);

const menuButton = ref(null);

onKeyStroke('Escape', () => {
  if (status.value) {
    status.value = false;
    menuButton.value?.focus();
  }
});

//@1ejun6 > watch current url > close mobile menu whenever navigation changes it including back \ forward
watch(() => route.fullPath, () => { status.value = false; });

async function logout() {
  if (logoutLoading.value) { return; }

  try {
    await auth.logout();
    status.value = false;
    await router.push('/login');
  } catch (error) {
    toast.error(error.message);
    if (!auth.isLoggedIn) await router.replace('/login');
  }
}
</script>

<template>
  <header class="sticky top-0 z-40 border-b bg-background">
    <div class="flex items-center justify-between px-4 py-2 xl:p-5">
      <!--@1ejun6 > centers navbar horizontal > fills available width-->
      <RouterLink :to="role === 'admin' ? { name: 'adminHome' } : homeRoute" class="flex shrink-0 items-center gap-2.5 font-heading text-lg" @click="status = false">
        Adopt a Book
        <img :src="bow" alt="" width="48" height="48" class="size-8 xl:size-12" />
      </RouterLink>
      <button ref="menuButton" type="button" class="grid size-11 shrink-0 place-items-center xl:hidden" aria-controls="mobile" :aria-label="status ? 'Close navigation' : 'Open navigation'" :aria-expanded="status" @click="status = !status">
        <HugeiconsIcon :icon="status ? Cancel01Icon : Menu01Icon" aria-hidden="true" />
      </button>
      <AppNavbarLinks :links="links" :logoutLoading="logoutLoading" @navigate="status = false" @logout="logout" />
    </div>
    <AppNavbarLinks v-show="status" mobile :links="links" :logoutLoading="logoutLoading" @navigate="status = false" @logout="logout" />
  </header>
</template>
