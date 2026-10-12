<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { auth } from '@/lib/auth'
import bow from '@/assets/bow.svg'
import { Cancel01Icon, Menu01Icon } from '@hugeicons/core-free-icons'
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'

const router = useRouter();
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
<header class="sticky top-0 z-50 border-b border-primary bg-background">
    <div class="mx-auto flex w-full items-center justify-between p-5"> <!--@1ejun6 > centers navbar horizontal > fills available width-->
      <RouterLink to="/" class="flex shrink-0 items-center gap-2 font-heading text-lg" @click="status = false">
        Adopt a Book
        <img :src="bow" alt="" width="48" height="48" />
      </RouterLink>
      <!--@1ejun6 > hides element when screen is 768px wide ||| wider-->
      <button type="button" class="size-11 md:hidden" aria-controls="mobile" :aria-expanded="status" @click="status = !status">
        <HugeiconsIcon :icon="status ? Cancel01Icon : Menu01Icon" aria-hidden="true" />
      </button>
      <!--@1ejun6 > md is 768px-->
      <NavigationMenu :viewport="false" class="ml-3 hidden max-w-none md:flex [&>div]:w-full"> <!--@1ejun6 > overrides menu max-w-max > allowing it to grow wider than its links > tailwind selector >  sets width to 100%-->
        <NavigationMenuList class="w-full">
          <NavigationMenuItem>
            <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
              <RouterLink to="/register">Browse Books</RouterLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
              <RouterLink to="/register">Adoption Drives</RouterLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem v-if="auth.ready && !auth.user" class="ml-auto"> <!--@1ejun6 > margin left-->
            <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
              <RouterLink to="/login">Login</RouterLink>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem v-if="auth.ready && !auth.user">
            <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
              <RouterLink to="/register">Create Account</RouterLink>
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
   <!--@1ejun6 > * > every direct child element of the element with these classes-->
    <nav id="mobile" v-show="status" class="grid p-5 text-right md:hidden *:py-2 *:hover:bg-accent"> <!--@1ejun6 > each link sits on its own row-->
      <RouterLink to="/register" @click="status = false">Browse Books</RouterLink>
      <RouterLink to="/register" @click="status = false">Adoption Drives</RouterLink>
      <RouterLink v-if="auth.ready && !auth.user" to="/login" @click="status = false">Login</RouterLink>
      <RouterLink v-if="auth.ready && !auth.user" to="/register" @click="status = false">Create Account</RouterLink>
      <button v-if="auth.ready && auth.user" type="button" class="text-right" :disabled="logoutLoading" @click="logout">
        Logout
      </button>
    </nav>
  </header>
</template>
