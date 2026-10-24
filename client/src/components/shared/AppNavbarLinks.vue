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
    class="grid gap-2.5 p-5 md:hidden *:rounded-lg *:p-2.5 *:text-right">
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
  <!--@1ejun6 > md is 768px-->
  <NavigationMenu v-else :viewport="false" class="ml-2.5 hidden max-w-none md:flex [&>div]:w-full">
    <!--@1ejun6 > overrides menu max-w-max > allowing it to grow wider than its links > tailwind selector >  sets width to 100%-->
    <NavigationMenuList class="w-full">
      <!--@1ejun6 > margin left > login link-->
      <NavigationMenuItem v-for="link in links" :key="link.name" :class="{ 'ml-auto': link.end }">
        <NavigationMenuLink asChild :active="route.name === link.name" :class="navigationMenuTriggerStyle()">
          <RouterLink :to="{ name: link.name }" @click="emit('navigate')">{{ link.label }}</RouterLink>
        </NavigationMenuLink>
      </NavigationMenuItem>
      
      
<!--@sree-sanjana06 > vertical separator between My Account and Logout-->
<NavigationMenuItem
  v-if="auth.ready && auth.user && links.some(link => link.name === 'customerAccount')"
  class="px-1 text-muted-foreground"
  aria-hidden="true">
  |
</NavigationMenuItem>

<!--@sree-sanjana06 > display Logout beside My Account while keeping existing logout functionality-->
<NavigationMenuItem
  v-if="auth.ready && auth.user"
  :class="{ 'ml-auto': !links.some(link => link.end) }">

  <button
    type="button"
    :class="navigationMenuTriggerStyle()"
    :disabled="logoutLoading"
    @click="emit('logout')">
    Logout
  </button>

</NavigationMenuItem>

    </NavigationMenuList>
  </NavigationMenu>
</template>
