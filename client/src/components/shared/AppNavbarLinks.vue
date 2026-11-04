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
  <nav v-if="mobile" id="mobile"
    class="grid max-h-[calc(100dvh-4rem)] gap-2 overflow-y-auto px-4 pb-3 text-sm xl:hidden">
    <!--@1ejun6 > each link sits on its own row-->
    <RouterLink v-for="link in links" :key="link.name" :to="{ name: link.name }" class="px-2.5 py-3 text-right data-[active]:bg-primary"
      :data-active="route.name === link.name ? true : undefined" @click="emit('navigate')">
      {{ link.label }}
    </RouterLink>
    <button v-if="auth.ready && auth.user" type="button" class="px-2.5 py-3 text-right" :disabled="logoutLoading"
      @click="emit('logout')">
      Logout
    </button>
  </nav>
  <NavigationMenu v-else :viewport="false" class="ml-2.5 hidden xl:block">
    <NavigationMenuList>
      <NavigationMenuItem v-for="link in links" :key="link.name" :class="{ 'ml-auto': link.end }">
        <NavigationMenuLink asChild :active="route.name === link.name" :class="navigationMenuTriggerStyle()">
          <RouterLink :to="{ name: link.name }" @click="emit('navigate')">{{ link.label }}</RouterLink>
        </NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem v-if="auth.ready && auth.user" :class="{ 'ml-auto': !links.some(link => link.end) }">
        <button type="button" :class="navigationMenuTriggerStyle()" :disabled="logoutLoading" @click="emit('logout')">
          Logout
        </button>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
</template>
