<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { auth } from '@/lib/auth'
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'

defineProps({
  links: { type: Array, required: true },
  mobile: { type: Boolean, default: false },
  logoutLoading: { type: Boolean, default: false }
});

const emit = defineEmits(['navigate', 'logout']);
const route = useRoute();
</script>

<template>
  <!--@1ejun6 > * > every direct child element of element with these classes-->
  <nav v-if="mobile" id="mobile"
    class="grid gap-2.5 p-5 lg:hidden *:rounded-lg *:p-2.5 *:text-right">
    <!--@1ejun6 > each link sits on its own row-->
    <RouterLink v-for="link in links" :key="link.name" :to="{ name: link.name }" class="washi-tape washi-tape-hover"
      :data-active="route.name === link.name ? true : undefined" @click="emit('navigate')">
      {{ link.label }}
    </RouterLink>
    <button v-if="auth.ready && auth.user" type="button" class="washi-tape washi-tape-hover" :disabled="logoutLoading"
      @click="emit('logout')">
      Logout
    </button>
  </nav>
  <!--@1ejun6 > show desktop links when customer menu has enough room -->
  <NavigationMenu v-else :viewport="false" class="ml-2.5 hidden lg:flex [&>div]:w-full">
    <!--@1ejun6 > fill reka menu wrapper so account & logout stay at right -->
    <NavigationMenuList class="w-full">
      <!--@1ejun6 > margin left > login link-->
      <NavigationMenuItem v-for="link in links" :key="link.name" :class="{ 'ml-auto': link.end }">
        <NavigationMenuLink asChild :active="route.name === link.name" :class="navigationMenuTriggerStyle()">
          <RouterLink :to="{ name: link.name }" @click="emit('navigate')">{{ link.label }}</RouterLink>
        </NavigationMenuLink>
      </NavigationMenuItem>

      <NavigationMenuItem v-if="auth.ready && auth.user" :class="{ 'ml-auto': !links.some(link => link.end) }">
        <button type="button" :class="navigationMenuTriggerStyle()" :disabled="logoutLoading" @click="emit('logout')">Logout</button>
      </NavigationMenuItem>

    </NavigationMenuList>
  </NavigationMenu>
</template>
