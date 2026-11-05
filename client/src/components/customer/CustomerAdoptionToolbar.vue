<script setup>
import { Button } from '@/components/ui/button';
import CustomerAdoptionStageTabs from './CustomerAdoptionStageTabs.vue';
import AppSearchInput from '@/components/shared/AppSearchInput.vue';
defineProps({
  tab: String,
  searching: Boolean,
  stageCounts: Object,
  loading: Boolean,
  loaded: Boolean,
  loadError: String,
  pickupError: String,
});
const search = defineModel('search', { type: String });
</script>
<template>
  <div class="space-y-3">
    <CustomerAdoptionStageTabs
      v-if="tab === 'active' && !searching"
      :counts="stageCounts"
      :showCounts="!loading && !loadError && !pickupError"
    />
    <AppSearchInput
      id="adoption-search"
      v-model="search"
      placeholder="Find a book"
      aria-label="Search all adoptions"
      :disabled="(!loaded && loading) || !!loadError"
      class="w-full"
    />
  </div>
  <div v-if="searching" class="text-xs text-muted-foreground">
    <Button variant="outline" type="button" class="min-h-11 " @click="search = ''">
      Back to {{ tab === 'active' ? 'Active' : 'History' }}
    </Button>
  </div>
</template>
