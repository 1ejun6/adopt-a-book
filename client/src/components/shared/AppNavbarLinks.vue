<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth'
const auth = useAuthStore()
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from '@/components/ui/navigation-menu'

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
    <Button variant="outline" :loading="logoutLoading" v-if="auth.ready && auth.user" type="button" class="justify-end border-0 bg-transparent px-2.5 py-3 text-right normal-case hover:bg-transparent" :disabled="logoutLoading"
      @click="emit('logout')">
      Logout
    </Button>
  </nav>
  <NavigationMenu v-else :viewport="false" class="ml-2.5 hidden xl:block">
    <NavigationMenuList>
      <NavigationMenuItem v-for="link in links" :key="link.name" :class="{ 'ml-auto': link.end }">
        <NavigationMenuLink asChild :active="route.name === link.name" class="px-4">
          <RouterLink :to="{ name: link.name }" @click="emit('navigate')">{{ link.label }}</RouterLink>
        </NavigationMenuLink>
      </NavigationMenuItem>
      <NavigationMenuItem v-if="auth.ready && auth.user" :class="{ 'ml-auto': !links.some(link => link.end) }">
        <Button variant="outline" :loading="logoutLoading" type="button" class="border-0 normal-case hover:bg-transparent" :disabled="logoutLoading" @click="emit('logout')">
          Logout
        </Button>
      </NavigationMenuItem>
    </NavigationMenuList>
  </NavigationMenu>
</template>
