<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { logoutSession } from '@/lib/session'
import { pages } from '@/router';
import { auth, role, homeRoute } from '@/lib/auth'
import { toast } from 'vue-sonner'
import bow from '@/assets/bow.svg'
import { Cancel01Icon, Menu01Icon } from '@hugeicons/core-free-icons'
import AppNavbarLinks from './AppNavbarLinks.vue'

const router = useRouter();
const route = useRoute();
//@1ejun6 > get routes > wait for session check > keep labelled pages allowed for current role
//@1ejun6 > computed updates this list when session \ role changes > page labels & roles are defined in ~router/index.js~
const links = computed(() => pages.filter(page => auth.ready && page.label && page.roles?.includes(role.value)));

const status = ref(false);
const logoutLoading = ref(false);

//@1ejun6 > watch current url > close mobile menu whenever navigation changes it including back \ forward
watch(() => route.fullPath, () => { status.value = false; });

async function logout() {
  if (logoutLoading.value) { return; }
  logoutLoading.value = true;

  try {
    await logoutSession();
    status.value = false;
    await router.push('/login');
  } catch (error) {
    toast.error(error.message);
  } finally {
    logoutLoading.value = false;
  }
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b bg-background">
    <div class="flex items-center justify-between p-5">
      <!--@1ejun6 > centers navbar horizontal > fills available width-->
      <RouterLink :to="homeRoute" class="flex shrink-0 items-center gap-2.5 font-heading text-lg" @click="status = false">
        Adopt a Book
        <img :src="bow" alt="" width="48" height="48" />
      </RouterLink>
      <!--@1ejun6 > hides element when screen is 768px wide \ wider-->
      <button type="button" class="washi-tape washi-tape-hover grid size-11 shrink-0 place-items-center rounded-lg md:hidden" aria-controls="mobile"
        :aria-expanded="status" @click="status = !status">
        <HugeiconsIcon :icon="status ? Cancel01Icon : Menu01Icon" aria-hidden="true" />
      </button>
      <AppNavbarLinks :links="links" :logoutLoading="logoutLoading"
        @navigate="status = false" @logout="logout" />
    </div>
    <AppNavbarLinks v-show="status" mobile :links="links" :logoutLoading="logoutLoading"
      @navigate="status = false" @logout="logout" />
  </header>
</template>
