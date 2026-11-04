<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { todayInSingapore } from '@/lib/utils';
import AppAdoptionDriveList from '@/components/shared/AppAdoptionDriveList.vue';
import AppAdoptionDriveDialog from '@/components/shared/AppAdoptionDriveDialog.vue';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const drives = ref([]);
const loading = ref(true);
const loaderror = ref('');
let controller;
let requestId = 0;
onBeforeUnmount(() => { requestId++; controller?.abort(); });

async function fetchdrives() {
  controller?.abort();
  const id = ++requestId;
  const request = new AbortController();
  controller = request;
  loading.value = true;
  loaderror.value = '';
  const today = todayInSingapore();

  try {
    const response = await api('/customer/drives', { method: 'GET', signal: request.signal });
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
  } catch (error) {
    if (id !== requestId || request.signal.aborted) return;
    loaderror.value = error.message;
    toast.error(error.message, { duration: Infinity, action: { label: 'retry', onClick: () => fetchdrives() } });
  } finally {
    if (id === requestId) loading.value = false;
  }
}

onMounted(() => fetchdrives());
const tab = ref('mine');
const tabs = [
  { value: 'mine', label: 'my drives' },
  { value: 'upcoming', label: 'upcoming' },
  { value: 'past', label: 'past' },
];
const groups = computed(() => ({
  mine: drives.value.filter(drive => !drive.past && drive.registered),
  upcoming: drives.value.filter(drive => !drive.past && !drive.registered),
  past: drives.value.filter(drive => drive.past),
}));
const saving = ref(false);
const selecteddrive = ref(null);
const dialogopen = ref(false);

async function togglersvp() {
  const drive = selecteddrive.value;
  if (!drive || saving.value) return;
  saving.value = true;
  try {
    await api(`/drives/${drive.id}/rsvp`, { method: drive.registered ? 'DELETE' : 'POST' });
    const registered = !drive.registered;
    const delta = registered ? -1 : 1;
    Object.assign(drive, { registered, spotsleft: Math.max(0, drive.spotsleft + delta) });
    toast.success(!registered ? 'registration cancelled' : 'registered for adoption drive');
    await fetchdrives();
    selecteddrive.value = drives.value.find(item => item.id === drive.id) || null;
    if (!selecteddrive.value) dialogopen.value = false;
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.value = false;
  }
}

function opendrive(drive) {
  selecteddrive.value = drive;
  dialogopen.value = true;
}
</script>

<template>
  <AppAdoptionDriveList :drives="groups[tab]" :loading="loading" :loaderror="loaderror"
    :showRegistration="tab !== 'mine'"
    :emptyTitle="tab === 'mine' ? 'no registered adoption drives' : `no ${tab} adoption drives`"
    :emptyDescription="tab === 'mine' ? 'browse upcoming drives to register for an event' : 'check back for future community events'"
    @open="opendrive" @retry="fetchdrives()">
    <template #tabs>
      <Tabs v-model="tab">
        <TabsList>
          <TabsTrigger v-for="item in tabs" :key="item.value" :value="item.value" class="gap-2.5">
            {{ item.label }}
            <Badge v-if="!loading" class="bg-primary tabular-nums">{{ groups[item.value].length }}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </template>
  </AppAdoptionDriveList>
  <AppAdoptionDriveDialog v-model:open="dialogopen" :drive="selecteddrive">
    <template #actions="{ drive }">
      <Button v-if="drive.registered && !drive.past" variant="outline" :disabled="saving" @click="togglersvp">
        {{ saving ? 'saving...' : 'cancel registration' }}
      </Button>
      <Button v-else-if="drive.status === 'open' && !drive.past && drive.spotsleft > 0" :disabled="saving"
        @click="togglersvp">
        {{ saving ? 'saving...' : 'rsvp' }}
      </Button>
      <p v-else role="status" class="text-sm">{{ drive.registered ? 'you registered for this drive' : drive.past ? 'this drive has ended' : drive.status === 'cancelled' ? 'this drive has been cancelled' : drive.spotsleft === 0 ? 'this drive is full' : 'registration has closed' }}</p>
    </template>
  </AppAdoptionDriveDialog>
</template>
