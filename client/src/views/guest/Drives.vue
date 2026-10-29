<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import axios from 'axios';
import { todayInSingapore } from '@/lib/utils';
import AppFilters from '@/components/shared/AppFilters.vue';
import AppPagination from '@/components/shared/AppPagination.vue';
import AppDriveCard from '@/components/shared/AppDriveCard.vue';
import AppDriveDialog from '@/components/shared/AppDriveDialog.vue';
import { Button } from '@/components/ui/button';

const drives = ref([]);
const loading = ref(true);
const loadError = ref('');
const filters = reactive({ search: '', when: 'upcoming', status: 'all', sort: 'asc' });
const page = ref(1);
const pageSize = 10;
const selectedDrive = ref(null);
const dialogOpen = ref(false);

const whenTabs = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

async function fetchDrives() {
  loading.value = true;
  loadError.value = '';
  try {
    const today = todayInSingapore();
    const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/drives`);
    const driveList = response.data.drives || [];

    // Get book counts for each station
    const stationIds = [...new Set(driveList.map((d) => d.mrtstationid).filter(Boolean))];
    const stationBookCounts = {};

    await Promise.all(
      stationIds.map(async (id) => {
        try {
          const bookResponse = await axios.get(`${import.meta.env.VITE_SERVER_URL}/books`, {
            params: { mrtstationids: id, status: 'available', limit: 1 },
          });
          stationBookCounts[id] = bookResponse.data.total ?? 0;
        } catch {
          stationBookCounts[id] = 0;
        }
      }),
    );
    // 
    drives.value = driveList.map((drive) => ({
      ...drive,
      past: drive.eventdate < today,
      bookCount: stationBookCounts[drive.mrtstationid] ?? 0,
    }));
  } catch (error) {
    loadError.value = error.message;
    toast.error(error.message);
  } finally {
    loading.value = false;
  }
}

const counts = computed(() => {
  const past = drives.value.filter((drive) => drive.past).length;
  return { upcoming: drives.value.length - past, past };
});

const visibleDrives = computed(() => {
  const search = filters.search.trim().toLowerCase();
  const direction = filters.sort === 'asc' ? 1 : -1;
  return drives.value
    .filter(
      (drive) =>
        drive.past === (filters.when === 'past') &&
        (filters.status === 'all' || drive.status === filters.status) &&
        (!search ||
          [drive.title, drive.location, drive.mrtstation.name].some((text) =>
            text.toLowerCase().includes(search),
          )),
    )
    .sort((a, b) => (a.eventdate > b.eventdate ? 1 : -1) * direction);
});

const pageCount = computed(() => Math.max(1, Math.ceil(visibleDrives.value.length / pageSize)));
const pageDrives = computed(() =>
  visibleDrives.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);

watch(filters, () => {
  page.value = 1;
});

function openDrive(drive) {
  selectedDrive.value = drive;
  dialogOpen.value = true;
}

function clearFilters() {
  filters.search = '';
  filters.status = 'all';
}

onMounted(fetchDrives);
</script>

<template>
  <section class="mx-auto w-full max-w-3xl flex flex-col gap-5">
    <header>
      <h1>Book Drives</h1>
      <p>meet fellow readers and give books a new home</p>
    </header>

    <AppFilters
      v-model:search="filters.search"
      v-model:status="filters.when"
      :tabs="whenTabs"
      :counts="loading ? {} : counts"
      searchPlaceholder="Search by drive, venue, MRT..."
    >
      <template #filters>
        <select v-model="filters.status" class="rounded-md border p-2 text-sm sm:w-auto">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select v-model="filters.sort" class="rounded-md border p-2 text-sm sm:w-auto">
          <option value="asc">Date: soonest first</option>
          <option value="desc">Date: latest first</option>
        </select>
      </template>
    </AppFilters>
    <!-- @brod Loading message -->
    <p v-if="loading" class="py-5 text-center text-sm">Loading book drives…</p>
    
    <!-- @brod Load Error message -->
    <div v-else-if="loadError" class="flex flex-col items-center gap-2 rounded-lg border p-5 text-center" role="alert">
      <h2>We couldn't load the book drives</h2>
      <p class="text-sm">{{ loadError }}</p>
      <Button @click="fetchDrives">Try again</Button>
    </div>


    <!-- @brod No drives message -->
    <div v-else-if="!visibleDrives.length" class="flex flex-col items-center rounded-lg border p-5 text-center">
      <template v-if="filters.search.trim() || filters.status !== 'all'">
        <h2>No drives match your filters</h2>
        <p class="text-sm">Try adjusting your filters</p>
        <Button variant="outline" @click="clearFilters">Clear filters</Button>
      </template>
      <template v-else>
        <h2>No {{ filters.when }} drives</h2>
        <p class="text-sm">Check back for future community events.</p>
      </template>
    </div>

    <!-- @brod Load Drives list  -->
    <template v-else>
      <ul class="flex flex-col">
        <li v-for="drive in pageDrives" :key="drive.id">
          <AppDriveCard :drive="drive" @open="openDrive(drive)" />
        </li>
      </ul>
      <AppPagination
        v-model:page="page"
        itemLabel="drives"
        :total="visibleDrives.length"
        :visibleCount="pageDrives.length"
        :pageSize="pageSize"
        :pageCount="pageCount"
      />
    </template>

    <AppDriveDialog v-model:open="dialogOpen" :drive="selectedDrive" />
  </section>
</template>
