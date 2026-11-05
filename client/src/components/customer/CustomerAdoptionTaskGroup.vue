<script setup>
defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
});
</script>

<template>
  <section data-adoption-group class="adoption-task-group">
    <header v-if="title" class="adoption-task-heading">
      <h3 class="adoption-task-title">{{ title }}</h3>
      <p v-if="description" class="adoption-task-description">{{ description }}</p>
    </header>
    <div class="adoption-task-rows">
      <div class="adoption-columns adoption-column-headings" aria-hidden="true">
        <span>Book</span><span class="text-center">Status</span><span>Pickup · SGT</span
        ><span><span class="sr-only">Action</span></span>
      </div>
      <slot />
    </div>
  </section>
</template>

<style scoped>
.adoption-task-group {
  min-width: 0;
}
.adoption-task-heading {
  display: grid;
  min-width: 0;
  gap: 4px;
  padding: 0 2px 14px;
}
.adoption-task-title {
  overflow-wrap: anywhere;
}
.adoption-task-description {
  color: var(--muted-foreground);
  font-size: 14px;
  overflow-wrap: anywhere;
}
.adoption-task-rows {
  display: grid;
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
}
</style>
