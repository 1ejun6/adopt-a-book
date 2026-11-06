<!-- Shared page width and alignment. Pass page-specific spacing and ARIA attributes on AppPage. -->
<script setup>
const props = defineProps({
  align: { type: String, default: 'center' },
});
</script>

<template>
  <section class="w-full min-w-0 max-w-[1800px]" :class="props.align === 'left' ? 'ml-0 mr-auto' : 'mx-auto'">
    <slot />
  </section>
</template>
