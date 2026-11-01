<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { todayInSingapore } from '@/lib/utils';
import AppLocationFilter from '@/components/shared/AppLocationFilter.vue';
import AppDriveFilters from '@/components/shared/AppDriveFilters.vue';
import AppPagination from '@/components/shared/AppPagination.vue';
import AppDriveCard from '@/components/shared/AppDriveCard.vue';
import AppDriveDialog from '@/components/shared/AppDriveDialog.vue';

const cachekey = 'guest-adoption-drive';
const drives = ref([]);
const loading = ref(true);
const loaderror = ref('');
const filters = reactive({ search: '', when: 'upcoming', status: 'all', sort: 'asc' });
const nearby = ref(null);
const page = ref(1);

function applylocation(result) {
  nearby.value = result ? new Set(result.stations.map(station => station.id)) : null;
  page.value = 1;
}
const pagesize = 10;

async function fetchdrives(refresh = false) {
  loading.value = true;
  loaderror.value = '';
  const today = todayInSingapore();

  if (!refresh) {
    try {
      const cached = JSON.parse(localStorage.getItem(cachekey));
      if (Array.isArray(cached) && cached.every(drive => drive && typeof drive.id === 'string' && typeof drive.title === 'string' && typeof drive.eventdate === 'string')) {
        //@1ejun6 > cached drives can cross midnight > update past dates using Singapore time
        drives.value = cached.map(drive => ({ ...drive, past: drive.eventdate < today }));
        loading.value = false;
        return;
      }
    } catch {
      //@1ejun6 > browser storage unavailable \ invalid > fetch drives from server instead
    }
  }

  try {
    const response = await api('/drives');
    const drivelist = response.drives;
    if (!Array.isArray(drivelist)) throw new Error('could not load drives > please try again');

    // Get book counts for each station
    const stationids = [...new Set(drivelist.map((d) => d.mrtstationid).filter(Boolean))];
    const stationbookcounts = {};

    await Promise.all(
      stationids.map(async (id) => {
        try {
          const bookresponse = await api('/books', {
            query: { mrtstationids: id, status: 'available', limit: 1 },
          });
          stationbookcounts[id] = bookresponse.total ?? 0;
        } catch {
          stationbookcounts[id] = null;
        }
      }),
    );
    drives.value = drivelist.map((drive) => ({
      ...drive,
      past: drive.eventdate < today,
      bookCount: stationbookcounts[drive.mrtstationid] ?? null,
    }));
    page.value = Math.min(page.value, pagecount.value);
    try {
      localStorage.setItem(cachekey, JSON.stringify(drives.value));
    } catch {
      //@1ejun6 > local storage may be blocked \ full > keep fetched drives visible
    }
  } catch (error) {
    loaderror.value = error.message;
    toast.error(error.message, { duration: Infinity, action: { label: 'retry', onClick: () => fetchdrives(true) } });
  } finally {
    loading.value = false;
  }
}

const counts = computed(() => {
  const past = drives.value.filter((drive) => drive.past).length;
  return { upcoming: drives.value.length - past, past };
});

const visibledrives = computed(() => {
  const search = filters.search.trim().toLowerCase();
  const direction = filters.sort === 'asc' ? 1 : -1;
  return drives.value
    .filter(
      (drive) =>
        drive.past === (filters.when === 'past') &&
        (!nearby.value || nearby.value.has(drive.mrtstationid)) &&
        (filters.status === 'all' || drive.status === filters.status) &&
        (!search ||
          [drive.title, drive.location, drive.mrtstation?.name || ''].some((text) =>
            text.toLowerCase().includes(search),
          )),
    )
    .sort((a, b) => (a.eventdate > b.eventdate ? 1 : -1) * direction);
});

const pagecount = computed(() => Math.max(1, Math.ceil(visibledrives.value.length / pagesize)));
const pagedrives = computed(() =>
  visibledrives.value.slice((page.value - 1) * pagesize, page.value * pagesize),
);

watch(filters, () => {
  page.value = 1;
});

onMounted(() => fetchdrives());
const selecteddrive = ref(null);
const dialogopen = ref(false);

function opendrive(drive) {
  selecteddrive.value = drive;
  dialogopen.value = true;
}
</script>

<template>
  <section class="mx-auto w-full max-w-3xl space-y-5">
    <header>
      <h1>book drives</h1>
      <p>meet fellow readers & give books a new home</p>
    </header>

    <AppDriveFilters v-model:search="filters.search" v-model:when="filters.when" v-model:status="filters.status"
      v-model:sort="filters.sort" :counts="counts" :loading="loading" />
    <AppLocationFilter @change="applylocation" />
    <!--@1ejun6 > loading placeholders use drive card props-->
    <ul v-if="loading" class="space-y-2.5">
      <li v-for="index in 3" :key="index">
        <AppDriveCard :isLoading="loading" />
      </li>
    </ul>

    <!-- @brod No drives message -->
    <template v-else-if="!loaderror && !visibledrives.length">
      <p v-if="nearby" class="text-sm" role="status">no drives near this location > try a wider distance</p>
      <div v-if="!filters.search.trim() && filters.status === 'all' && !nearby"
        class="space-y-2.5 rounded-lg border p-5 text-center">
        <h2>no {{ filters.when }} drives</h2>
        <p class="text-sm">check back for future community events</p>
      </div>
    </template>

    <!-- @brod Load Drives list  -->
    <template v-else-if="drives.length">
      <ul class="space-y-2.5">
        <li v-for="drive in pagedrives" :key="drive.id">
          <AppDriveCard :drive="drive" :isLoading="loading" @open="opendrive(drive)" />
        </li>
      </ul>
      <AppPagination v-model:page="page" itemLabel="drives" :total="visibledrives.length"
        :visibleCount="pagedrives.length" :pageSize="pagesize" :pageCount="pagecount" :loading="loading"
        :disabled="loading" />
    </template>

    <AppDriveDialog v-model:open="dialogopen" :drive="selecteddrive" />
  </section>
</template>
