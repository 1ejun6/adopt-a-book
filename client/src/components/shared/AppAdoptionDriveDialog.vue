<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    action: { label: 'log in', onClick: () => goauth('login') },
    cancel: { label: 'create account', onClick: () => goauth('register') },
  });
}

const ended = computed(() => props.drive.past && props.drive.status !== 'cancelled');
const statuscolor = computed(() => ended.value ? 'neutral' : ({ open: 'green', closed: 'rose', cancelled: 'neutral' })[props.drive.status]);
const canRsvp = computed(() => props.drive.status === 'open' && !props.drive.past);

const actionMessage = computed(() => {
  if (props.drive.status === 'cancelled') return 'this drive has been cancelled';
  if (ended.value) return 'this drive has ended';
  return 'registration has closed';
});

//@brod > Computed property to get book drive details
const fields = computed(() => {
  if (!props.drive) return [];
  const { eventdate, location } = props.drive;
  return [
    { label: 'date', value: formatDate(eventdate, { dateStyle: 'full' }) },
    { label: 'venue', value: location },
  ];
});

//@1ejun6 > zero is a valid remaining count > never assume all slots are free
const spots = computed(() => Number.isInteger(props.drive.spotsleft) ? `${props.drive.spotsleft} ${props.drive.spotsleft === 1 ? 'slot' : 'slots'}` : null);

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
      method: 'GET',
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
        <div class="flex items-start gap-2.5">
          <DialogTitle class="min-w-0 flex-1">{{ drive.title }}</DialogTitle>
          <Badge :variant="statuscolor" class="shrink-0">{{ ended ? 'ended' : drive.status }}</Badge>
        </div>
        <DialogDescription>details for the selected adoption drive</DialogDescription>
      </DialogHeader>

      <div class="dialog-body">
        <div class="space-y-5">
          <dl class="grid gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)]">
            <template v-for="field in fields" :key="field.label">
              <dt class="text-muted-foreground">{{ field.label }}</dt>
              <dd>
                <a v-if="field.value && field.label === 'venue'" :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(/singapore/i.test(drive.location) ? drive.location : `${drive.location}, Singapore`)}`" target="_blank" rel="noopener noreferrer" class="underline">{{ field.value }}</a>
                <template v-else>{{ field.value || 'not provided' }}</template>
              </dd>
            </template>
            <template v-if="!drive.past">
              <dt class="text-muted-foreground">{{ spots ? 'available slots' : 'capacity' }}</dt>
              <dd>{{ spots || `${drive.maxcapacity} ${drive.maxcapacity === 1 ? 'slot' : 'slots'}` }}</dd>
            </template>
          </dl>

          <section v-if="drive.mrtstationid" class="space-y-2.5">
            <h3>book list</h3>

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

        <DialogFooter class="flex-col text-center">
          <slot name="actions" :drive="drive">
            <Button v-if="canRsvp" @click="requestrsvp">rsvp</Button>
            <p v-else class="grid min-h-9 place-items-center">{{ actionMessage }}</p>
          </slot>
        </DialogFooter>
      </div>
    </DialogContent>
  </Dialog>

</template>
