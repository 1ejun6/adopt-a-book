<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import AppFilters from '@/components/shared/AppFilters.vue';
import AppDriveCard from '@/components/shared/AppDriveCard.vue';
import AppDriveDialog from '@/components/shared/AppDriveDialog.vue';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const drives = ref([]);
const loading = ref(true);
const loadError = ref('');
const filters = reactive({ search: '', status: 'all' });
const selectedDrive = ref(null);
const dialogOpen = ref(false);

const statusTabs = [
  { value: 'all', label: 'All drives' },
  { value: 'open', label: 'Open', status: 'open' },
  { value: 'closed', label: 'Closed', status: 'closed' },
  { value: 'cancelled', label: 'Cancelled', status: 'cancelled' },
];

//@brod > Toast and error panel share this message.
async function fetchDrives() {
  loading.value = true;
  loadError.value = '';
  try {
    drives.value = (await api('/drives')).drives;
  } catch (error) {
    loadError.value = error.message;
    toast.error(error.message);
  } finally {
    loading.value = false;
  }
}
//@brod > Counts the full list, not the search results.
const counts = computed(() => {
  const totals = { all: drives.value.length, open: 0, closed: 0, cancelled: 0 };
  for (const drive of drives.value) {
    totals[drive.status]++;
  }
  return totals;
});

//@brod > Filtered here because the API is not paginated. Date order stays.
const visibleDrives = computed(() => {
  const search = filters.search.trim().toLowerCase();
  return drives.value.filter(
    (drive) =>
      (filters.status === 'all' || drive.status === filters.status) &&
      [drive.title, drive.location, drive.mrtstation?.name].some((text) =>
        text?.toLowerCase().includes(search),
      ),
  );
});

//@brod > Left set on close so the dialog does not blank mid-animation.
function openDrive(drive) {
  selectedDrive.value = drive;
  dialogOpen.value = true;
}

function clearFilters() {
  Object.assign(filters, { search: '', status: 'all' });
}

onMounted(fetchDrives);
</script>

<template>
  <section class="mx-auto w-full min-w-0 max-w-3xl space-y-5">
    <header>
      <h1>Book Drives</h1>
      <p class="text-muted-foreground">meet fellow readers and give books a new home</p>
    </header>

    <!--@brod > Empty while loading so the tabs do not flash 0.-->
    <AppFilters
      v-model:search="filters.search"
      v-model:status="filters.status"
      :tabs="statusTabs"
      :counts="loading ? {} : counts"
      searchPlaceholder="Search by drive, venue, MRT..."
    >
      <!--@brod > Replaces AppFilters' genre dropdown with the match count.-->
      <template #filters>
        <p class="self-center text-sm text-muted-foreground" aria-live="polite">
          {{ loading ? 'Loading drives…' : `${visibleDrives.length} of ${drives.length} drives` }}
        </p>
      </template>
    </AppFilters>

    <div v-if="loading" class="space-y-5 motion-safe:animate-pulse" role="status" aria-busy="true">
      <div v-for="card in 3" :key="card" class="flex items-center gap-5 rounded-lg border p-5">
        <Skeleton class="size-15 shrink-0" />
        <div class="flex-1 space-y-2.5">
          <Skeleton class="h-5 w-12" />
          <Skeleton class="h-6 w-2/3" />
          <Skeleton class="h-4 w-1/2" />
        </div>
      </div>
    </div>

    <div v-else-if="loadError" class="space-y-2.5 rounded-lg border p-5 text-center" role="alert">
      <h2>We couldn't load the book drives</h2>
      <p class="text-sm text-muted-foreground">{{ loadError }}</p>
      <Button @click="fetchDrives">Try again</Button>
    </div>

    <div v-else-if="!drives.length" class="space-y-2.5 rounded-lg border p-5 text-center">
      <h2>No book drives to show yet</h2>
      <p class="text-sm text-muted-foreground">
        Check back for future community events. You can still browse books in the meantime.
      </p>
      <Button asChild variant="outline">
        <RouterLink :to="{ name: 'guestHome' }">Browse books</RouterLink>
      </Button>
    </div>

    <div v-else-if="!visibleDrives.length" class="space-y-2.5 rounded-lg border p-5 text-center">
      <h2>No drives match your search</h2>
      <p class="text-sm text-muted-foreground">Try another status tab or search term</p>
      <Button variant="outline" @click="clearFilters">Clear filters</Button>
    </div>

    <ul v-else class="space-y-5">
      <li v-for="drive in visibleDrives" :key="drive.id">
        <AppDriveCard :drive="drive" @open="openDrive(drive)" />
      </li>
    </ul>

    <AppDriveDialog v-model:open="dialogOpen" :drive="selectedDrive" />
  </section>
</template>
