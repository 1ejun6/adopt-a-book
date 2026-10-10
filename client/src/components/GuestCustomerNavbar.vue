<script setup>
import {NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle} from '@/components/ui/navigation-menu'
</script>

<template>
  <header>
    <div class="mx-auto flex w-full items-center justify-between p-5"> <!--j > centers navbar horizontal > fills available width-->
      <a href="/" class="font-heading text-lg">Adopt a Book</a>
      <NavigationMenu :viewport="false">
        <NavigationMenuList>
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
           <NavigationMenuItem>
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
  </header>
</template>
