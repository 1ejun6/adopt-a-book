<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { auth } from '@/lib/auth'
import bow from '@/assets/bow.svg'
import { Cancel01Icon, Menu01Icon } from '@hugeicons/core-free-icons'
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'

const router = useRouter();
const activeNavItem = ref('');

function selectNavItem(item) {
  activeNavItem.value = item;
  status.value = false;
}
const status = ref(false);
const logoutLoading = ref(false);

onMounted(checkSession);

async function checkSession() {
  if (auth.ready) return;

  try {
    const response = await api('/session');
    if (!auth.ready) auth.user = response.user;
  } catch (error) {
    if (error.status !== 401) console.error(error.message);
  } finally {
    auth.ready = true;
  }
}

async function logout() {
  if (logoutLoading.value) {
    return;
  }

  logoutLoading.value = true;

  try {
    const data = { method: 'POST' };
    await api('/logout', data);
    auth.user = null;
    auth.ready = true;
    status.value = false;
    console.log('logout successful');
    await router.push('/login');
  } catch (error) {
    console.error(error.message);
  } finally {
    logoutLoading.value = false;
  }
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border bg-background">
    <div class="mx-auto flex w-full items-center justify-between p-5">
      <!--@1ejun6 > centers navbar horizontal > fills available width-->
      <RouterLink to="/" class="flex shrink-0 items-center gap-2.5 font-heading text-lg" @click="status = false">
        Adopt a Book
        <img :src="bow" alt="" width="48" height="48" />
      </RouterLink>
      <!--@1ejun6 > hides element when screen is 768px wide ||| wider-->
      <button type="button" class="washi-tape washi-tape-hover size-11 rounded-lg md:hidden" aria-controls="mobile"
        :aria-expanded="status" @click="status = !status">
        <HugeiconsIcon :icon="status ? Cancel01Icon : Menu01Icon" aria-hidden="true" />
      </button>
      <!--@1ejun6 > md is 768px-->
      <NavigationMenu :viewport="false" class="ml-3 hidden max-w-none md:flex [&>div]:w-full">
        <!--@1ejun6 > overrides menu max-w-max > allowing it to grow wider than its links > tailwind selector >  sets width to 100%-->
        <NavigationMenuList class="w-full">
          <NavigationMenuItem>
            <NavigationMenuLink as-child :active="activeNavItem === 'browseBooks'"
              :class="navigationMenuTriggerStyle()">
              <RouterLink to="/register" @click="selectNavItem('browseBooks')">Browse Books</RouterLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink as-child :active="activeNavItem === 'adoptionDrives'"
              :class="navigationMenuTriggerStyle()">
              <RouterLink to="/register" @click="selectNavItem('adoptionDrives')">Adoption Drives</RouterLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem v-if="auth.ready && !auth.user" class="ml-auto"> <!--@1ejun6 > margin left-->
            <NavigationMenuLink as-child :active="activeNavItem === 'login'" :class="navigationMenuTriggerStyle()">
              <RouterLink to="/login" @click="selectNavItem('login')">Login</RouterLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem v-if="auth.ready && !auth.user">
            <NavigationMenuLink as-child :active="activeNavItem === 'register'" :class="navigationMenuTriggerStyle()">
              <RouterLink to="/register" @click="selectNavItem('register')">Create Account</RouterLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem v-if="auth.ready && auth.user" class="ml-auto">
            <button type="button" :class="navigationMenuTriggerStyle()" :disabled="logoutLoading" @click="logout">
              Logout
            </button>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
    <!--@1ejun6 > * > every direct child element of element with these classes-->
    <nav id="mobile" v-show="status"
      class="grid gap-2.5 p-5 text-right md:hidden *:rounded-lg *:px-2.5 *:py-2">
      <!--@1ejun6 > each link sits on its own row-->
      <RouterLink class="washi-tape washi-tape-hover" :data-active="activeNavItem === 'browseBooks' ? true : undefined" to="/register"
        @click="selectNavItem('browseBooks')">Browse Books</RouterLink>
      <RouterLink class="washi-tape washi-tape-hover" :data-active="activeNavItem === 'adoptionDrives' ? true : undefined" to="/register"
        @click="selectNavItem('adoptionDrives')">Adoption Drives</RouterLink>
      <RouterLink class="washi-tape washi-tape-hover" :data-active="activeNavItem === 'login' ? true : undefined"
        v-if="auth.ready && !auth.user" to="/login" @click="selectNavItem('login')">Login</RouterLink>
      <RouterLink class="washi-tape washi-tape-hover" :data-active="activeNavItem === 'register' ? true : undefined"
        v-if="auth.ready && !auth.user" to="/register" @click="selectNavItem('register')">Create Account</RouterLink>
      <button v-if="auth.ready && auth.user" type="button" class="washi-tape washi-tape-hover text-right" :disabled="logoutLoading"
        @click="logout">
        Logout
      </button>
    </nav>
  </header>
</template>
