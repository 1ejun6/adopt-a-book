<script setup>
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { UserGroupIcon } from '@hugeicons/core-free-icons';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { toast } from 'vue-sonner';
import axios from 'axios';
import { formatDate } from '@/lib/utils';

const bookLimit = 5;

const props = defineProps({ drive: { type: Object, default: null } });
const open = defineModel('open', { type: Boolean, default: false });

const ended = computed(() => props.drive.past && props.drive.status !== 'cancelled');
const canRsvp = computed(() => props.drive.status === 'open' && !props.drive.past);

const actionMessage = computed(() => {
  if (props.drive.status === 'cancelled') return 'This drive has been cancelled';
  if (ended.value) return 'This drive has ended';
  return 'Registration has closed';
});

//@brod > Computed property to get book drive details
const fields = computed(() => {
  if (!props.drive) return [];
  const { eventdate, location, mrtstation } = props.drive;
  const station = mrtstation && `${mrtstation.name} (${mrtstation.codes.join(' / ')})`;
  const atStation = mrtstation.name === location;
  return [
    { label: 'Date', value: formatDate(eventdate, { dateStyle: 'full' }) },
    { label: 'Venue', value: atStation ? station : location },
    !atStation && { label: 'Nearest MRT', value: station },
  ].filter(Boolean);
});

// @brod > get max capacity data
const spots = computed(() => `${props.drive.maxcapacity ?? 0} places`);

const books = ref([]);
const totalBooks = ref(0);
const loadingBooks = ref(false);
const bookError = ref('');

//@brod > Fetch books when dialog opens
async function fetchBooks() {
  if (!props.drive.mrtstationid) {
    books.value = [];
    totalBooks.value = 0;
    return;
  }
  loadingBooks.value = true;
  bookError.value = '';
  try {
    const response = await axios.get(`${import.meta.env.VITE_SERVER_URL}/books`, {
      params: {
        mrtstationids: props.drive.mrtstationid,
        status: 'available',
        limit: bookLimit,
      }
    });
    books.value = response.data.books || [];
    totalBooks.value = response.data.total || 0;
  } catch (error) {
    bookError.value = error.message;
    toast.error(error.message);
  } finally {
    loadingBooks.value = false;
  }
}

// @brod > Fetch books when dialog opens
watch(
  () => open.value && props.drive,
  (active) => {
    if (active) fetchBooks();
  },
  { immediate: true },
);
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent v-if="drive" class="max-w-lg">
      <DialogHeader>
        <AppStatusBadge :status="ended ? 'closed' : drive.status">
          {{ ended ? 'ended' : drive.status }}
        </AppStatusBadge>
        <DialogTitle>{{ drive.title }}</DialogTitle>
        <DialogDescription class="sr-only">Details for the selected book drive</DialogDescription>
      </DialogHeader>

      <hr />

      <div class="flex flex-col gap-4 py-2">
        <dl class="grid gap-2 sm:grid-cols-3">
          <template v-for="field in fields" :key="field.label">
            <dt class="font-medium">{{ field.label }}</dt>
            <dd class="sm:col-span-2">{{ field.value || 'Not provided' }}</dd>
          </template>
          <template v-if="!drive.past">
            <dt class="font-medium">Spots</dt>
            <dd class="flex items-center gap-1 sm:col-span-2">
              <HugeiconsIcon :icon="UserGroupIcon" class="size-4" />
              {{ spots }}
            </dd>
          </template>
        </dl>

        <div class="flex flex-col gap-1">
          <h2>What to expect</h2>
          <p class="text-sm">{{ drive.description || 'No description recorded.' }}</p>
          <p class="text-sm">Browse donated books and meet other readers.</p>
        </div>

        <section v-if="drive.mrtstationid" class="flex flex-col gap-2">
          <h2>Books near {{ drive.mrtstation?.name || 'this drive' }}</h2>

          <ul v-if="loadingBooks" class="flex flex-col gap-2">
            <li v-for="i in 3" :key="i"><AppBookIdentity loading /></li>
          </ul>

          <p v-else-if="bookError" class="text-sm">{{ bookError }}</p>
          <p v-else-if="!books.length" class="text-sm">No available books at this station yet.</p>
          <template v-else>
            <ul class="flex flex-col gap-2">
              <li v-for="book in books" :key="book.id">
                <AppBookIdentity
                  :title="book.title"
                  :author="book.authors?.join(', ')"
                  :cover="book.coverurl"
                />
              </li>
            </ul>
            <p v-if="totalBooks > books.length" class="text-xs">
              and {{ totalBooks - books.length }} more
            </p>
          </template>
        </section>
      </div>

      <hr />

      <DialogFooter class="flex flex-col gap-2 text-center">
        <slot name="actions" :drive="drive">
          <Button v-if="canRsvp" asChild>
            <RouterLink :to="{ name: 'register' }">Join to RSVP</RouterLink>
          </Button>
          <p v-else>{{ actionMessage }}</p>
        </slot>
        <p class="text-xs">An RSVP helps organisers plan. It doesn't reserve a book.</p>
      </DialogFooter>
    </DialogContent>
  </Dialog>

</template>
