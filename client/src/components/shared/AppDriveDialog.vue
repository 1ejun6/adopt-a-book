<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';
import { formatDate } from '@/lib/utils';


const props = defineProps({ drive: { type: Object, default: null } });
const open = defineModel('open', { type: Boolean, default: false });

//@brod > Retrieve fields, skip nearest MRT when the venue is already that station.
const fields = computed(() => {
  const { eventdate, location, mrtstation, maxcapacity } = props.drive;
  const station = mrtstation && `${mrtstation.name} (${mrtstation.codes.join(' / ')})`;
  const atStation = mrtstation?.name === location;
  return [
    { label: 'Date', value: formatDate(eventdate, { dateStyle: 'full' }) },
    { label: 'Venue', value: atStation ? station : location },
    !atStation && { label: 'Nearest MRT', value: station },
    { label: 'Capacity', value: `${maxcapacity} places` },
  ].filter(Boolean);
});
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent v-if="drive">
      <DialogHeader>
        <AppStatusBadge :status="drive.status" />
        <DialogTitle>{{ drive.title }}</DialogTitle>
        <DialogDescription class="sr-only">details for the selected book drive</DialogDescription>
      </DialogHeader>
      <hr />
      <div class="space-y-5 py-2.5">
        <dl class="grid gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)]">
          <template v-for="field in fields" :key="field.label">
            <dt class="text-muted-foreground">{{ field.label }}</dt>
            <dd class="min-w-0">{{ field.value || 'Not provided' }}</dd>
          </template>
        </dl>
        <div class="space-y-2.5">
          <h2>What to expect</h2>
          <p class="whitespace-pre-line">{{ drive.description || 'No description recorded.' }}</p>
          <p>Browse donated books and meet other readers. Available titles depend on donations.</p>
        </div>
      </div>
      <hr />
      <!--@brod > Guest RSVP. A customer page can replace this slot.-->
      <DialogFooter class="flex-col">
        <slot name="actions" :drive="drive">
          <Button v-if="drive.status === 'open'" asChild class="w-full">
            <RouterLink :to="{ name: 'register' }">Join to RSVP</RouterLink>
          </Button>
          <p v-else class="text-center">
            {{
              drive.status === 'cancelled'
                ? 'This drive has been cancelled'
                : 'Registration has closed'
            }}
          </p>
        </slot>
        <p class="text-center text-xs text-muted-foreground">
          An RSVP helps organisers plan. It doesn't reserve a book.
        </p>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
