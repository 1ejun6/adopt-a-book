<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { UserGroupIcon } from '@hugeicons/core-free-icons';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import AppStatusBadge from '@/components/shared/AppStatusBadge.vue';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const bookLimit = 5;

const props = defineProps({
  drive: { type: Object, default: null },
});
const open = defineModel('open', { type: Boolean, default: false });
const router = useRouter();

function goauth(name) {
  open.value = false;
  router.push({ name });
}

//@1ejun6 > rsvp needs an account > keep auth choices visible until clicked \ dismissed
function requestrsvp() {
  toast.info('log in to rsvp', {
    id: 'drive-rsvp',
    duration: Infinity,
    closeButton: true,
    style: { pointerEvents: 'auto' },
    classes: { toast: 'rsvptoast' },
    action: { label: 'log in', onClick: () => goauth('login') },
    cancel: { label: 'create account', onClick: () => goauth('register') },
  });
}

const ended = computed(() => props.drive.past && props.drive.status !== 'cancelled');
const canRsvp = computed(() => props.drive.status === 'open' && !props.drive.past);

const actionMessage = computed(() => {
  if (props.drive.status === 'cancelled') return 'this drive has been cancelled';
  if (ended.value) return 'this drive has ended';
  return 'registration has closed';
});

//@brod > Computed property to get book drive details
const fields = computed(() => {
  if (!props.drive) return [];
  const { eventdate, location, mrtstation } = props.drive;
  const station = mrtstation && `${mrtstation.name} (${mrtstation.codes.join(' / ')})`;
  const atStation = mrtstation?.name === location;
  return [
    { label: 'date', value: formatDate(eventdate, { dateStyle: 'full' }) },
    { label: 'venue', value: atStation ? station : location },
    !atStation && { label: 'nearest MRT', value: station },
  ].filter(Boolean);
});

// @brod > get max capacity data
const spots = computed(() => {
  const count = props.drive.maxcapacity ?? 0;
  return `${count} ${count === 1 ? 'slot' : 'slots'} total`;
});

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
    const response = await api('/books', {
      query: {
        mrtstationids: props.drive.mrtstationid,
        status: 'available',
        limit: bookLimit,
      }
    });
    books.value = response.books || [];
    totalBooks.value = response.total || 0;
  } catch (error) {
    bookError.value = error.message;
    toast.error(error.message, { duration: Infinity, style: { pointerEvents: 'auto' }, action: { label: 'retry', onClick: fetchBooks } });
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
    <DialogContent v-if="drive">
      <DialogHeader>
        <AppStatusBadge :status="ended ? 'closed' : drive.status">
          {{ ended ? 'ended' : drive.status }}
        </AppStatusBadge>
        <DialogTitle class="text-2xl">{{ drive.title }}</DialogTitle>
        <DialogDescription class="sr-only">selected book drive details</DialogDescription>
      </DialogHeader>

      <hr />

      <div class="space-y-5">
        <dl class="grid gap-2.5 sm:grid-cols-[auto_1fr]">
          <template v-for="field in fields" :key="field.label">
            <dt>{{ field.label }}</dt>
            <dd>{{ field.value || 'not provided' }}</dd>
          </template>
          <template v-if="!drive.past">
            <dt>attendee slots</dt>
            <dd class="flex gap-2.5">
              <HugeiconsIcon :icon="UserGroupIcon" class="size-5 shrink-0" />
              {{ spots }}
            </dd>
          </template>
        </dl>

        <section v-if="drive.mrtstationid" class="space-y-2.5">
          <h2 class="text-lg">book list</h2>

          <ul v-if="loadingBooks" class="space-y-2.5">
            <li v-for="i in 3" :key="i">
              <AppBookIdentity loading />
            </li>
          </ul>

          <p v-else-if="!bookError && !books.length">no available books at this station yet</p>
          <template v-else-if="!bookError">
            <ul class="space-y-2.5">
              <li v-for="book in books" :key="book.id">
                <AppBookIdentity :title="book.title" :author="book.authors?.join(', ')" :cover="book.coverurl" />
              </li>
            </ul>
            <p v-if="totalBooks > books.length" class="text-xs">
              & {{ totalBooks - books.length }} more
            </p>
          </template>
        </section>
      </div>

      <hr />

      <DialogFooter class="flex-col gap-5 text-center">
        <slot name="actions" :drive="drive">
          <Button v-if="canRsvp" @click="requestrsvp">rsvp</Button>
          <p v-else>{{ actionMessage }}</p>
        </slot>
      </DialogFooter>
    </DialogContent>
  </Dialog>

</template>
