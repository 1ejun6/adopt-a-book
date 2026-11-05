<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { useAdoptionDrives } from '@/composables/useAdoptionDrives';
import AppAdoptionDriveList from '@/components/shared/AppAdoptionDriveList.vue';
import AppAdoptionDriveDialog from '@/components/shared/AppAdoptionDriveDialog.vue';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const { drives, loading, error: loaderror, refresh: fetchdrives } = useAdoptionDrives({ endpoint: '/customer/drives' });
watch(loaderror, message => {
  if (message) toast.error(message, { duration: Infinity, action: { label: 'retry', onClick: fetchdrives } });
});
const tab = ref('mine');
const tabs = [
  { value: 'mine', label: 'my drives' },
  { value: 'upcoming', label: 'upcoming' },
  { value: 'past', label: 'History/Cancelled' },
];
const groups = computed(() => ({
  mine: drives.value.filter(drive => !drive.past && drive.registered),
  upcoming: drives.value.filter(drive => !drive.past && !drive.registered),
  past: drives.value.filter(drive => drive.past),
}));
const saving = ref(false);
const selecteddrive = ref(null);
const dialogopen = ref(false);
watch(drives, () => {
  if (!selecteddrive.value && typeof route.query.drive === 'string') {
    selecteddrive.value = drives.value.find(item => item.id === route.query.drive) || null;
    dialogopen.value = !!selecteddrive.value;
  }
  if (!selecteddrive.value) return;
  selecteddrive.value = drives.value.find(item => item.id === selecteddrive.value.id) || null;
  if (!selecteddrive.value) dialogopen.value = false;
});

async function togglersvp() {
  const drive = selecteddrive.value;
  if (!drive || saving.value) return;
  saving.value = true;
  try {
    const response = await api(`/drives/${drive.id}/rsvp`, { method: drive.registered ? 'DELETE' : 'POST' });
    const registered = response.registered;
    Object.assign(drive, { registered, ...response.drive });
    toast.success(!registered ? 'registration cancelled' : 'registered for adoption drive');
    await fetchdrives();
  } catch (error) {
    toast.error(error.message);
  } finally {
    saving.value = false;
  }
}

function opendrive(drive) {
  if (saving.value) return;
  selecteddrive.value = drive;
  dialogopen.value = true;
}
</script>

<template>
  <AppAdoptionDriveList emptyToast :drives="groups[tab]" :loading="loading" :loaderror="loaderror"
    :history="tab === 'past'"
    :showRegistration="tab !== 'mine'"
    :emptyTitle="tab === 'mine' ? 'no registered adoption drives' : tab === 'past' ? 'no past or cancelled adoption drives' : 'no upcoming adoption drives'"
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
      <Button v-if="drive.registered && !drive.past" variant="outline" :disabled="saving" @click="togglersvp" :loading="saving"><AppIcon name="cancel" />
        {{ saving ? 'saving...' : 'cancel registration' }}
      </Button>
      <Button v-else-if="drive.status === 'open' && !drive.past && drive.spotsleft > 0" :disabled="saving"
        @click="togglersvp" :loading="saving"><AppIcon name="community" />
        {{ saving ? 'saving...' : 'rsvp' }}
      </Button>
      <p v-else role="status" class="text-sm">{{ drive.status === 'cancelled' ? 'This drive was cancelled' : drive.registered ? 'You registered for this drive' : drive.past ? 'This drive has ended' : drive.spotsleft === 0 ? 'this drive is full' : 'registration has closed' }}</p>
    </template>
  </AppAdoptionDriveDialog>
</template>
