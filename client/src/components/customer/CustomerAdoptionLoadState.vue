<script setup>
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
defineProps({ loading: Boolean, loaded: Boolean, loadError: String, pickupError: String });
const emit = defineEmits(['refresh']);
</script>
<template>
  <div v-if="loading && !loaded" class="space-y-3" role="status" aria-busy="true">
    <span class="sr-only">Loading your adoptions</span>
    <div v-for="i in 3" :key="i" class="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 sm:p-5">
      <AppBookIdentity loading coverClass="w-12" />
      <div class="space-y-2.5"><Skeleton class="h-5 w-32" /><Skeleton class="h-4 w-full" /></div>
    </div>
  </div>
  <div
    v-else-if="loadError && !loaded"
    class="space-y-4 rounded-xl border bg-card p-5"
    role="alert"
  >
    <h2>We couldn’t load your adoptions</h2>
    <p class="text-sm">{{ loadError }}</p>
    <Button type="button" variant="outline" @click="emit('refresh')">Try again</Button>
  </div>
  <template v-else>
    <p v-if="loading" role="status" class="text-sm">Checking for updates…</p>
    <div v-if="loadError" role="alert" class="space-y-2 rounded-lg border p-4 text-sm">
      <p>
        We couldn’t refresh your adoptions. Previously loaded records are shown. Check updates
        before making changes.
      </p>
      <Button variant="outline" @click="emit('refresh')">Try again</Button>
    </div>
    <div v-if="pickupError" class="space-y-2 rounded-lg bg-badge-amber/40 p-4 text-sm" role="alert">
      <p>Pickup information is unavailable. Retry before arranging a pickup or travelling.</p>
      <Button type="button" variant="outline" @click="emit('refresh')"
        >Retry pickup information</Button
      >
    </div>
    <slot />
  </template>
</template>
