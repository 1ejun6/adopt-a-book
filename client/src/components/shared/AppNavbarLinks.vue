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
    class="grid max-h-[calc(100dvh-5.5rem)] gap-2.5 overflow-y-auto p-4 xl:hidden">
    <!--@1ejun6 > each link sits on its own row-->
    <RouterLink v-for="link in links" :key="link.name" :to="{ name: link.name }" class="p-2.5 text-right data-[active]:bg-primary"
      :data-active="route.name === link.name ? true : undefined" @click="emit('navigate')">
      {{ link.label }}
    </RouterLink>
    <button v-if="auth.ready && auth.user" type="button" class="p-2.5 text-right" :disabled="logoutLoading"
      @click="emit('logout')">
      Logout
    </button>
  </nav>
  <NavigationMenu v-else :viewport="false" class="ml-2.5 hidden xl:block">
    <NavigationMenuList>
      <NavigationMenuItem v-for="link in links" :key="link.name">
        <NavigationMenuLink asChild :active="route.name === link.name" :class="navigationMenuTriggerStyle()">
          <RouterLink :to="{ name: link.name }" @click="emit('navigate')">{{ link.label }}</RouterLink>
        </NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem v-if="auth.ready && auth.user" class="ml-auto">
        <button type="button" :class="navigationMenuTriggerStyle()" :disabled="logoutLoading" @click="emit('logout')">
          Logout
        </button>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
</template>
