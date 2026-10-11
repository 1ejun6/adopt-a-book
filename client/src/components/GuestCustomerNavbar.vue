<script setup>
import { ref } from 'vue'
import bow from '@/assets/bow.svg'
import { Cancel01Icon, Menu01Icon } from '@hugeicons/core-free-icons'
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu'

const status = ref(false);
</script>

<template>
<header class="sticky top-0 z-50">
    <div class="mx-auto flex w-full items-center justify-between p-5"> <!--j > centers navbar horizontal > fills available width-->
      <a href="/" class="flex shrink-0 items-center gap-2 font-heading text-lg">
        Adopt a Book
        <img :src="bow" alt="" width="48" height="48" />
      </a>
      <!--j > hides element when screen is 768px wide ||| wider-->
      <button type="button" class="size-11 md:hidden" aria-controls="mobile" :aria-expanded="status" @click="status = !status">
        <HugeiconsIcon :icon="status ? Cancel01Icon : Menu01Icon" aria-hidden="true" />
      </button>
      <!--j > md is 768px-->
      <NavigationMenu :viewport="false" class="ml-3 hidden max-w-none md:flex [&>div]:w-full"> <!--j > overrides menu max-w-max > allowing it to grow wider than its links > tailwind selector >  sets width to 100%-->
        <NavigationMenuList class="w-full">
          <NavigationMenuItem>
            <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
              <a href="/register">Browse Books</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
              <a href="/register">Adoption Drives</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem class="ml-auto"> <!--j > margin left-->
            <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
              <a href="/login">Login</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink as-child :class="navigationMenuTriggerStyle()">
              <a href="/register">Create Account</a>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
   <!--j > * > every direct child element of the element with these classes-->
    <nav id="mobile" v-show="status" class="grid p-5 text-right md:hidden *:py-2 *:hover:bg-accent"> <!--j > each link sits on its own row-->
      <a href="/register">Browse Books</a>
      <a href="/register">Adoption Drives</a>
      <a href="/login">Login</a>
      <a href="/register">Create Account</a>
    </nav>
  </header>
</template>
