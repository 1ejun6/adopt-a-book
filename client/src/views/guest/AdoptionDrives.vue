<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { todayInSingapore } from '@/lib/utils';
import AppAdoptionDriveList from '@/components/shared/AppAdoptionDriveList.vue';
import AppAdoptionDriveDialog from '@/components/shared/AppAdoptionDriveDialog.vue';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const cacheKey = 'guest-adoption-drive';
const drives = ref([]);
const loading = ref(true);
const loaderror = ref('');
let controller;
let requestId = 0;
onBeforeUnmount(() => { requestId++; controller?.abort(); });

async function fetchdrives(refresh = false) {
  controller?.abort();
  const id = ++requestId;
  const request = new AbortController();
  controller = request;
  loading.value = true;
  loaderror.value = '';
  const today = todayInSingapore();

  if (!refresh && cacheKey) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey));
      if (Array.isArray(cached) && cached.every(drive => drive && typeof drive.id === 'string' && typeof drive.title === 'string' && typeof drive.eventdate === 'string' && Number.isInteger(drive.spotsleft))) {
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
    const response = await api('/drives', { method: 'GET', signal: request.signal });
    const drivelist = response.drives;
    if (!Array.isArray(drivelist)) throw new Error('could not load adoption drives > please try again');

    // Get book counts for each station
    const stationIds = [...new Set(drivelist.map(drive => drive.mrtstationid).filter(Boolean))];
    const bookCounts = new Map(await Promise.all(stationIds.map(async id => {
      try {
        const books = await api('/books', {
          method: 'GET', signal: request.signal,
          query: { mrtstationids: id, status: 'available', limit: 1 },
        });
        return [id, books.total ?? 0];
      } catch (error) {
        if (request.signal.aborted) throw error;
        return [id, null];
      }
    })));

    if (id !== requestId) return;
    drives.value = drivelist.map(drive => ({
      ...drive,
      past: drive.eventdate < today,
      bookCount: bookCounts.get(drive.mrtstationid) ?? null,
    }));
    try {
      if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(drives.value));
    } catch {
      //@1ejun6 > local storage may be blocked \ full > keep fetched drives visible
    }
  } catch (error) {
    if (id !== requestId || request.signal.aborted) return;
    loaderror.value = error.message;
    toast.error(error.message, { duration: Infinity, action: { label: 'retry', onClick: () => fetchdrives(true) } });
  } finally {
    if (id === requestId) loading.value = false;
  }
}

onMounted(() => fetchdrives());
const tab = ref('upcoming');
const tabs = ['upcoming', 'past'];
const groups = computed(() => ({
  upcoming: drives.value.filter(drive => !drive.past),
  past: drives.value.filter(drive => drive.past),
}));
const selecteddrive = ref(null);
const dialogopen = ref(false);

function opendrive(drive) {
  selecteddrive.value = drive;
  dialogopen.value = true;
}
</script>

<template>
  <AppAdoptionDriveList :drives="groups[tab]" :loading="loading" :loaderror="loaderror"
    :emptyTitle="`no ${tab} adoption drives`" @open="opendrive" @retry="fetchdrives(true)">
    <template #tabs>
      <Tabs v-model="tab">
        <TabsList>
          <TabsTrigger v-for="item in tabs" :key="item" :value="item" class="gap-2.5">
            {{ item }}
            <Badge v-if="!loading" class="bg-primary tabular-nums">{{ groups[item].length }}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </template>
  </AppAdoptionDriveList>
  <AppAdoptionDriveDialog v-model:open="dialogopen" :drive="selecteddrive" />
</template>
