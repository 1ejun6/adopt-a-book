<script setup>
import CustomerAdoptionCard from '@/components/customer/CustomerAdoptionCard.vue';

defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  applications: { type: Array, required: true },
  showPickup: { type: Boolean, default: false },
  pickupAvailable: { type: Boolean, default: false },
  emptyTitle: { type: String, default: '' },
  emptyDescription: { type: String, default: '' },
});
const emit = defineEmits(['view', 'pickup']);
</script>

<template>
  <section class="space-y-4">
    <div class="space-y-1">
      <h2>{{ title }}</h2>
      <p class="text-sm text-muted-foreground">{{ description }}</p>
    </div>
    <div v-if="!applications.length" class="space-y-2 rounded-xl border bg-card p-10 text-center">
      <h3>{{ emptyTitle }}</h3>
      <p class="text-sm text-muted-foreground">{{ emptyDescription }}</p>
    </div>
    <div v-else class="grid gap-4 md:grid-cols-2">
      <CustomerAdoptionCard v-for="application in applications" :key="application.id" :application="application"
        :showPickup="showPickup" :pickupAvailable="pickupAvailable" @view="emit('view', $event)"
        @pickup="emit('pickup', $event)" />
    </div>
  </section>
</template>
