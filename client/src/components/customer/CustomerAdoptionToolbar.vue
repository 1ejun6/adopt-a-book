<script setup>
import CustomerAdoptionHistoryTabs from './CustomerAdoptionHistoryTabs.vue';
import AppIcon from '@/components/shared/AppIcon.vue';
import { Button } from '@/components/ui/button';
import CustomerAdoptionStageTabs from './CustomerAdoptionStageTabs.vue';
import AppSearchInput from '@/components/shared/AppSearchInput.vue';
defineProps({
  tab: String,
  searching: Boolean,
  stageCounts: Object,
  historyCounts: Object,
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
    <CustomerAdoptionHistoryTabs
      v-if="tab === 'history' && !searching"
      :counts="historyCounts"
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
  <div v-if="searching" class="text-sm text-muted-foreground">
    <Button variant="outline" type="button" class="min-h-11 " @click="search = ''"><AppIcon name="back" />
      Back to {{ tab === 'active' ? 'Active' : 'History' }}
    </Button>
  </div>
</template>
