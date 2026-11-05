<script setup>
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { useAdoptionDrives } from '@/composables/useAdoptionDrives';
import AppAdoptionDriveList from '@/components/shared/AppAdoptionDriveList.vue';
import AppAdoptionDriveDialog from '@/components/shared/AppAdoptionDriveDialog.vue';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

const { drives, loading, error: loaderror, refresh: fetchdrives } = useAdoptionDrives({ endpoint: '/drives', cacheKey: 'guest-adoption-drive' });
watch(loaderror, message => {
  if (message) toast.error(message, { duration: Infinity, action: { label: 'retry', onClick: fetchdrives } });
});
const tab = ref('upcoming');
const tabs = ['upcoming', 'past'];
const groups = computed(() => ({
  upcoming: drives.value.filter(drive => !drive.past),
  past: drives.value.filter(drive => drive.past),
}));
const selecteddrive = ref(null);
const dialogopen = ref(false);
watch(drives, () => {
  if (!selecteddrive.value) return;
  selecteddrive.value = drives.value.find(item => item.id === selecteddrive.value.id) || null;
  if (!selecteddrive.value) dialogopen.value = false;
});

function opendrive(drive) {
  selecteddrive.value = drive;
  dialogopen.value = true;
}
</script>

<template>
  <AppAdoptionDriveList :drives="groups[tab]" :loading="loading" :loaderror="loaderror"
    :history="tab === 'past'"
    :emptyTitle="tab === 'past' ? 'no past or cancelled adoption drives' : 'no upcoming adoption drives'" @open="opendrive" @retry="fetchdrives(true)">
    <template #tabs>
      <Tabs v-model="tab">
        <TabsList>
          <TabsTrigger v-for="item in tabs" :key="item" :value="item" class="gap-2.5">
            {{ item === 'past' ? 'History/Cancelled' : item }}
            <Badge v-if="!loading" class="bg-primary tabular-nums">{{ groups[item].length }}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </template>
  </AppAdoptionDriveList>
  <AppAdoptionDriveDialog v-model:open="dialogopen" :drive="selecteddrive" />
</template>
