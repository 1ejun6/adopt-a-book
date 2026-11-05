<script setup>
import AppSearchInput from '@/components/shared/AppSearchInput.vue';
import AppAdoptionDriveLegend from '@/components/shared/AppAdoptionDriveLegend.vue';

defineProps({ statuses: { type: Array, default: () => ['open', 'closed'] } });
const search = defineModel('search', { type: String, default: '' });
const status = defineModel('status', { type: String, default: 'all' });
const sort = defineModel('sort', { type: String, default: 'asc' });
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
      <slot name="tabs" />
      <AppAdoptionDriveLegend v-model:status="status" :statuses="statuses" class="w-full sm:ml-auto sm:w-auto" />
    </div>
    <div class="flex flex-col gap-2.5 sm:flex-row">
      <AppSearchInput v-model="search" class="flex-1" placeholder="Search drives" />
      <div class="flex gap-2.5 sm:shrink-0">
        <select v-model="status" aria-label="Adoption drive status" class="min-w-0 flex-1 min-h-11 rounded-lg border bg-transparent px-3 text-sm font-normal sm:w-32 sm:flex-none">
          <option value="all">All</option>
          <option v-for="value in statuses" :key="value" :value="value">{{ value }}</option>
        </select>
        <select v-model="sort" title="sort adoption drives by date"
          class="min-w-0 flex-1 min-h-11 rounded-lg border bg-transparent px-3 text-sm font-normal sm:w-40 sm:flex-none">
          <option value="asc">earliest first</option>
          <option value="desc">latest first</option>
        </select>
      </div>
    </div>
  </section>
</template>
