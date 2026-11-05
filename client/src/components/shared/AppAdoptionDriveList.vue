<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import AppPage from '@/components/shared/AppPage.vue';
import { getPageCount } from '@/lib/utils';
import { computed, reactive, ref, watch, onBeforeUnmount } from 'vue';
import { toast } from 'vue-sonner';
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
  history: { type: Boolean, default: false },
  emptyToast: { type: Boolean, default: false },
  emptyTitle: { type: String, default: 'no adoption drives' },
  emptyDescription: { type: String, default: 'check back for future community events' },
});
const emit = defineEmits(['open', 'retry']);
const filters = reactive({ search: '', status: 'all', sort: 'asc' });
const statuses = computed(() => props.history ? ['open', 'closed', 'cancelled'] : ['open', 'closed']);
watch(statuses, values => {
  if (!values.includes(filters.status)) filters.status = 'all';
});
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

const emptyNotice = computed(() => {
  if (props.loaderror || visibledrives.value.length) return null;
  if (nearby.value) return ['no adoption drives near this location', 'try a wider distance'];
  if (filters.search.trim() || filters.status !== 'all') return ['no matching drives', 'adjust your filters or check another tab'];
  return [props.emptyTitle, props.emptyDescription];
});
let emptyToastId;
let lastEmptyKey = '';
watch([() => props.loading, () => props.emptyToast, emptyNotice], () => {
  if (props.loading) return;
  const notice = props.emptyToast ? emptyNotice.value : null;
  const key = notice ? JSON.stringify(notice) : '';
  if (key === lastEmptyKey) return;
  if (emptyToastId !== undefined) toast.dismiss(emptyToastId);
  lastEmptyKey = key;
  if (notice) emptyToastId = toast.info(notice[0], {
    description: notice[1], duration: Infinity, closeButton: true,
  });
}, { immediate: true });
onBeforeUnmount(() => { if (emptyToastId !== undefined) toast.dismiss(emptyToastId); });

</script>

<template>
  <AppPage class="adoption-drive-page space-y-5">
    <header class="text-center">
      <h1>adoption drives</h1>
      <p class="text-sm">meet fellow readers & give books a new home</p>
    </header>

    <AppAdoptionDriveFilters v-model:search="filters.search" v-model:status="filters.status"
      v-model:sort="filters.sort" :statuses="statuses">
      <template #tabs>
        <slot name="tabs" />
      </template>
    </AppAdoptionDriveFilters>
    <AppLocationFilter @change="applylocation" />
    <!--@1ejun6 > loading placeholders use drive card props-->
    <ul v-if="loading && !drives.length" class="space-y-2.5">
      <li v-for="index in 3" :key="index">
        <AppAdoptionDriveCard :isLoading="loading" />
      </li>
    </ul>

    <!-- @brod No drives message -->
    <template v-else-if="!loaderror && !visibledrives.length">
      <p v-if="emptyToast" class="sr-only" role="status">{{ emptyNotice?.join('. ') }}</p>
      <p v-else-if="nearby" class="text-sm" role="status">no adoption drives near this location > try a wider distance</p>
      <p v-else-if="filters.search.trim() || filters.status !== 'all'" role="status" class="text-sm">no matching drives > adjust your
        filters or check another tab</p>
      <div v-else class="space-y-2.5 rounded-lg border p-5 text-center">
        <h2>{{ props.emptyTitle }}</h2>
        <p class="text-sm">{{ props.emptyDescription }}</p>
      </div>
    </template>

    <div v-else-if="loaderror" class="space-y-2.5 rounded-lg border p-5" role="alert">
      <p class="text-sm">{{ loaderror }}</p>
      <Button type="button" variant="outline" @click="emit('retry')" :loading="loading"><AppIcon name="refresh" /><span class="sr-only">try again</span></Button>
    </div>

    <!-- @brod Load Drives list  -->
    <template v-else-if="drives.length">
      <ul class="space-y-2.5" :aria-busy="loading">
        <li v-for="drive in pagedrives" :key="drive.id">
          <AppAdoptionDriveCard :drive="drive" :showRegistration="props.showRegistration" @open="emit('open', drive)" />
        </li>
      </ul>

    </template>

    <AppPagination v-if="!loaderror" v-model:page="page" itemLabel="adoption drives" :total="visibledrives.length"
      :visibleCount="pagedrives.length" :pageSize="pagesize" :loading="loading" :disabled="loading" />
  </AppPage>
</template>
