<script setup>
import AppSearchInput from '@/components/shared/AppSearchInput.vue';
import AppDriveLegend from '@/components/shared/AppDriveLegend.vue';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const props = defineProps({
  counts: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
});
const search = defineModel('search', { type: String, default: '' });
const when = defineModel('when', { type: String, default: 'upcoming' });
const status = defineModel('status', { type: String, default: 'all' });
const sort = defineModel('sort', { type: String, default: 'asc' });
const tabs = [
  { value: 'upcoming', label: 'upcoming' },
  { value: 'past', label: 'past' },
];
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-wrap items-center gap-2.5 sm:gap-5">
      <Tabs v-model="when">
        <TabsList>
          <TabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value" class="gap-2.5">
            {{ tab.label }}
            <Badge v-if="!props.loading && props.counts[tab.value] != null" class="bg-primary tabular-nums">
              {{ props.counts[tab.value] }}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <AppDriveLegend class="w-full sm:ml-auto sm:w-auto" />
    </div>
    <div class="flex flex-col gap-2.5 sm:flex-row">
      <AppSearchInput v-model="search" class="flex-1"
        placeholder="search drives by name \ venue \ mrt" />
      <div class="flex gap-2.5">
        <select v-model="status" title="drive status" class="min-w-0 flex-1 rounded-md border p-2.5 text-sm">
          <option value="all">all statuses</option>
          <option value="open">open</option>
          <option value="closed">closed</option>
          <option value="cancelled">cancelled</option>
        </select>
        <select v-model="sort" title="sort drives by date" class="min-w-0 flex-1 rounded-md border p-2.5 text-sm">
          <option value="asc">earliest first</option>
          <option value="desc">latest first</option>
        </select>
      </div>
    </div>
  </section>
</template>
