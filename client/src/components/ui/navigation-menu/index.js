//@1ejun6 > export every piece from one file so pages can use one import path
export { default as NavigationMenu } from './NavigationMenu.vue';
export { default as NavigationMenuContent } from './NavigationMenuContent.vue';
export { default as NavigationMenuItem } from './NavigationMenuItem.vue';
export { default as NavigationMenuLink } from './NavigationMenuLink.vue';
export { default as NavigationMenuList } from './NavigationMenuList.vue';
export { default as NavigationMenuTrigger } from './NavigationMenuTrigger.vue';
export { default as NavigationMenuViewport } from './NavigationMenuViewport.vue';

export const navigationMenuTriggerStyle = () =>
  'washi-tape washi-tape-hover inline-flex h-9 items-center rounded-lg px-4 text-sm';
//@1ejun6 > keeps it inline while arranging its contents with flex
//@1ejun6 > 36px
