<script setup>
import { getPageCount } from '@/lib/utils';
import { computed, reactive, ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
import AppLocationFilter from '@/components/shared/AppLocationFilter.vue';
import AppAdoptionDriveFilters from '@/components/shared/AppAdoptionDriveFilters.vue';
import AppPagination from '@/components/shared/AppPagination.vue';
import AppAdoptionDriveCard from '@/components/shared/AppAdoptionDriveCard.vue';

const props = defineProps({
  drives: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  loaderror: { type: String, default: '' },
  showRegistration: { type: Boolean, default: true },
  emptyTitle: { type: String, default: 'no adoption drives' },
  emptyDescription: { type: String, default: 'check back for future community events' },
});
const emit = defineEmits(['open', 'retry']);
const filters = reactive({ search: '', status: 'all', sort: 'asc' });
const nearby = ref(null);
const page = ref(1);
const pagesize = 10;

function applylocation(result) {
  nearby.value = result ? new Set(result.stations.map(station => station.id)) : null;
  page.value = 1;
}

const visibledrives = computed(() => {
  const search = filters.search.trim().toLowerCase();
  const direction = filters.sort === 'asc' ? 1 : -1;
  return props.drives
    .filter(
      (drive) =>
        (!nearby.value || nearby.value.has(drive.mrtstationid)) &&
        (filters.status === 'all' || drive.status === filters.status) &&
        (!search ||
          [drive.title, drive.location, drive.mrtstation?.name || ''].some((text) =>
            text.toLowerCase().includes(search),
          )),
    )
    .sort((a, b) => a.eventdate.localeCompare(b.eventdate) * direction || a.id.localeCompare(b.id));
});

const pagecount = computed(() => getPageCount(visibledrives.value.length, pagesize));
const pagedrives = computed(() =>
  visibledrives.value.slice((page.value - 1) * pagesize, page.value * pagesize),
);

watch([filters, () => props.drives], () => {
  page.value = 1;
});

watch(pagecount, count => { page.value = Math.min(page.value, count); });
</script>

<template>
  <section class="mx-auto w-full max-w-3xl space-y-5">
    <header>
      <h1>adoption drives</h1>
      <p class="text-sm">meet fellow readers & give books a new home</p>
    </header>

    <AppAdoptionDriveFilters v-model:search="filters.search" v-model:status="filters.status"
      v-model:sort="filters.sort">
      <template #tabs>
        <slot name="tabs" />
      </template>
    </AppAdoptionDriveFilters>
    <AppLocationFilter @change="applylocation" />
    <p v-if="!loading && !loaderror" class="text-sm text-muted-foreground" role="status">{{ visibledrives.length }}
      adoption
      drives found</p>
    <!--@1ejun6 > loading placeholders use drive card props-->
    <ul v-if="loading" class="space-y-2.5">
      <li v-for="index in 3" :key="index">
        <AppAdoptionDriveCard :isLoading="loading" />
      </li>
    </ul>

    <!-- @brod No drives message -->
    <template v-else-if="!loaderror && !visibledrives.length">
      <p v-if="nearby" class="text-sm" role="status">no adoption drives near this location > try a wider distance</p>
      <p v-else-if="filters.search.trim() || filters.status !== 'all'" role="status" class="text-sm">no matching drives > adjust your
        filters or check another tab</p>
      <div v-else class="space-y-2.5 rounded-lg border p-5 text-center">
        <h2>{{ props.emptyTitle }}</h2>
        <p class="text-sm">{{ props.emptyDescription }}</p>
      </div>
    </template>

    <div v-else-if="loaderror" class="space-y-2.5 rounded-lg border p-5" role="alert">
      <p class="text-sm">{{ loaderror }}</p>
      <Button type="button" variant="outline" @click="emit('retry')">try again</Button>
    </div>

    <!-- @brod Load Drives list  -->
    <template v-else-if="drives.length">
      <ul class="space-y-2.5">
        <li v-for="drive in pagedrives" :key="drive.id">
          <AppAdoptionDriveCard :drive="drive" :isLoading="loading" :showRegistration="props.showRegistration" @open="emit('open', drive)" />
        </li>
      </ul>
      <AppPagination v-model:page="page" itemLabel="adoption drives" :total="visibledrives.length"
        :visibleCount="pagedrives.length" :pageSize="pagesize" :loading="loading" :disabled="loading" />
    </template>

  </section>
</template>
