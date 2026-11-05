<script setup>
import AppSearchInput from '@/components/shared/AppSearchInput.vue';
import AppAdoptionDriveLegend from '@/components/shared/AppAdoptionDriveLegend.vue';

const search = defineModel('search', { type: String, default: '' });
const status = defineModel('status', { type: String, default: 'all' });
const sort = defineModel('sort', { type: String, default: 'asc' });
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-center gap-2.5 sm:gap-5">
      <slot name="tabs" />
      <AppAdoptionDriveLegend v-model:status="status" class="w-full sm:ml-auto sm:w-auto" />
    </div>
    <div class="flex flex-col gap-2.5 sm:flex-row">
      <AppSearchInput v-model="search" class="flex-1" placeholder="Search drives" />
      <div class="flex gap-2.5">
        <select v-model="status" title="adoption drive status" class="min-w-0 flex-1 min-h-11 rounded-lg border px-3 text-base">
          <option value="all">all statuses</option>
          <option value="open">open</option>
          <option value="closed">closed</option>
          <option value="cancelled">cancelled</option>
        </select>
        <select v-model="sort" title="sort adoption drives by date"
          class="min-w-0 flex-1 min-h-11 rounded-lg border px-3 text-base">
          <option value="asc">earliest first</option>
          <option value="desc">latest first</option>
        </select>
      </div>
    </div>
  </section>
</template>
