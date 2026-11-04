<script setup>
import { computed, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { formatDate, todayInSingapore } from '@/lib/date';
import { ArrowRight01Icon, ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const loading = ref(false);
const pickups = ref(null);
const now = new Date();
const today = todayInSingapore(now);
const displayDate = now.toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const attentionQueues = reactive([
  { label: 'Overdue', action: 'View collection', view: 'overdue', count: null, rows: null, empty: 'No overdue pickups.', to: { name: 'adminAppointments', state: { view: 'overdue' } } },
  { label: 'Pickup confirmations', action: 'Review proposal', view: 'awaiting', count: null, rows: null, empty: 'No pickups awaiting confirmation.', to: { name: 'adminAppointments', state: { view: 'awaiting' } } },
  { label: 'Adoption requests', action: 'View requests', count: null, rows: null, empty: 'No pending adoption requests.', to: { name: 'adminApplications' } },
  { label: 'Upcoming drive', action: 'View drives', count: null, rows: null, empty: 'No upcoming drives.', to: { name: 'adminDrives' } }
]);
const [overdue, awaiting, requests, upcomingDrive] = attentionQueues;
const todayQueue = reactive({ count: null, to: { name: 'adminAppointments', state: { view: 'today' } } });
const summary = [
  { label: 'Requests awaiting review', queue: requests },
  { label: 'Pickups awaiting confirmation', queue: awaiting },
  { label: 'Pickups today', queue: todayQueue },
  { label: 'Overdue pickups', queue: overdue }
];
const selectedQueue = ref(0);
const attentionPreviews = computed(() => attentionQueues.map(queue => {
  const record = queue.rows?.[0];
  return { queue, record, book: queue.view ? record?.book : record?.bookid };
}));

//@lee-hlmilk > match application &&& appointment tab rules > failed requests stay unavailable rather than showing a false zero
async function fetchDashboard() {
  if (loading.value) return;
  loading.value = true;
  pickups.value = null;
  todayQueue.count = null;
  for (const queue of attentionQueues) {
    queue.count = null;
    queue.rows = null;
  }
  try {
    const results = await Promise.allSettled([
      api('/admin/applications', { query: { status: 'pending', limit: 1 } }).then(response => {
        requests.count = response.counts.pending;
        requests.rows = response.adoptionapplications;
      }),
      api('/admin/drives', { query: { view: 'upcoming', limit: 1 } }).then(response => {
        upcomingDrive.count = response.total;
        upcomingDrive.rows = response.drives;
      }),
      api('/admin/appointments', { query: { view: 'today', limit: 5 } }).then(response => {
        todayQueue.count = response.counts.today;
        awaiting.count ??= response.counts.awaiting;
        overdue.count ??= response.counts.overdue;
        //@lee-hlmilk > server returns the earliest five pickups &&& full tab totals > no complete-list downloads
        pickups.value = response.appointments;
      }),
      ...[overdue, awaiting].map(async queue => {
        const response = await api('/admin/appointments', { query: { view: queue.view, limit: 1 } });
        queue.count = response.total;
        queue.rows = response.appointments;
      })
    ]);
    for (const result of results) {
      if (result.status === 'rejected') { toast.error(result.reason.message, { action: { label: 'retry', onClick: fetchDashboard } }); }
    }
  } finally { loading.value = false; }
}
fetchDashboard();
</script>

<template>
  <section class="mx-auto w-full min-w-0 max-w-7xl space-y-5" aria-labelledby="dashboard-title">
    <header class="flex flex-wrap items-center justify-between gap-5">
      <div>
        <h1 id="dashboard-title">Dashboard</h1>
        <p class="text-muted-foreground">Review requests, collections and upcoming drives.</p>
      </div>
      <div class="text-sm text-muted-foreground sm:text-right">
        <time :datetime="today">{{ displayDate }}</time>
        <p>Singapore time</p>
      </div>
    </header>

    <!--@lee-hlmilk > full-card links open the corresponding queue > navigation state selects the appointment tab on arrival-->
    <dl class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="item in summary" :key="item.label" class="relative rounded-lg border p-5 hover:bg-primary" :aria-busy="loading">
        <RouterLink :to="item.queue.to" class="absolute inset-0 rounded-lg" :aria-label="`${item.label}: ${loading ? 'Loading' : item.queue.count ?? 'Unavailable'}`" />
        <dt class="text-sm text-muted-foreground">{{ item.label }}</dt>
        <dd class="mt-2.5 flex items-center justify-between gap-2.5 font-heading text-3xl">
          <Skeleton v-if="loading" class="h-9 w-12" />
          <span v-else>{{ item.queue.count ?? '—' }}</span>
          <HugeiconsIcon :icon="ArrowUpRight01Icon" class="size-5" aria-hidden="true" />
        </dd>
      </div>
    </dl>

    <div class="grid items-start gap-5 lg:grid-cols-3">
      <section class="min-w-0 overflow-hidden rounded-lg border lg:col-span-2" aria-labelledby="attention-title">
        <header class="border-b bg-primary p-5">
          <h2 id="attention-title">Needs attention</h2>
        </header>
        <Tabs v-model="selectedQueue">
          <TabsList aria-label="Attention queues" class="gap-0 border-b">
            <TabsTrigger v-for="(queue, index) in attentionQueues" :key="queue.label" :value="index"
              class="min-h-11 flex-1 justify-center gap-2 rounded-none border-b-2 border-transparent bg-background px-3 text-center text-muted-foreground hover:bg-badge-neutral data-[state=active]:border-foreground data-[state=active]:text-foreground">
              {{ queue.label }} <Badge variant="neutral">{{ queue.count ?? '—' }}</Badge>
            </TabsTrigger>
          </TabsList>
          <!--@lee-hlmilk > stack the panels so the tallest preview sets their shared height -->
          <div class="grid">
            <TabsContent v-for="({ queue, record, book }, index) in attentionPreviews" :key="queue.label" :value="index"
                force-mount :inert="selectedQueue !== index" :aria-hidden="selectedQueue !== index"
                class="col-start-1 row-start-1 flex min-h-64 min-w-0 flex-col data-[state=inactive]:invisible">
                <div v-if="loading && !queue.rows" class="space-y-2.5 p-5" role="status" aria-label="Loading attention queue">
                  <Skeleton class="h-20" />
                  <Skeleton class="h-4 w-2/3" />
                </div>
                <template v-else-if="queue === upcomingDrive && record">
                  <p class="border-b px-5 py-3 text-sm text-muted-foreground">
                    Earliest event first · 1 of {{ queue.count }}
                  </p>
                  <article class="p-5">
                    <div class="grid items-start gap-4 sm:grid-cols-[3fr_2fr]">
                      <div class="min-w-0 space-y-1.5">
                        <h3 class="break-words">{{ record.title }}</h3>
                        <p class="break-words text-sm text-muted-foreground">{{ record.location }}</p>
                      </div>
                      <div class="min-w-0 space-y-1.5 text-sm">
                        <p><time :datetime="record.eventdate">{{ formatDate(record.eventdate) }}</time></p>
                        <StatusBadge :status="record.status" />
                        <p>{{ record.userids.length }} / {{ record.maxcapacity }} registrations</p>
                      </div>
                    </div>
                  </article>
                </template>
                <template v-else-if="record">
                  <p class="border-b px-5 py-3 text-sm text-muted-foreground">
                    {{ queue.view === 'awaiting' ? 'Earliest proposed time first' : queue.view === 'overdue' ? 'Oldest collection date first' : 'Oldest request first' }}
                    · 1 of {{ queue.count }}
                  </p>
                  <article class="p-5">
                    <div class="grid items-start gap-4 sm:grid-cols-[3fr_2fr]">
                      <div class="min-w-0">
                        <BookIdentity :title="book?.title || record.booktitle || 'Untitled'"
                          :author="book?.authors?.join(', ') || 'Unknown author'" :cover="book?.coverurl" wrap />
                        <p class="mt-0.5 pl-[3.625rem] text-sm">{{ record.customer || record.userid?.name }}</p>
                      </div>
                      <div class="min-w-0 space-y-1.5 pl-[3.625rem] text-sm sm:pl-0">
                        <p v-if="queue.view">{{ formatDate(record.appointmentdate) }} · {{ record.timeslot }}</p>
                        <p v-else>Submitted {{ formatDate(record.createdat) }}</p>
                        <StatusBadge :status="record.status" />
                        <p v-if="queue.view === 'overdue'" class="text-destructive">
                          {{ record.appointmentdate === today ? 'Collection due today and awaiting confirmation.' : 'Past collection date. Follow up with the customer.' }}
                        </p>
                        <p v-else>{{ queue.view === 'awaiting' ? 'Proposed time needs confirmation' : 'Adoption request needs review' }}</p>
                        <p class="text-muted-foreground">{{ record.location || book?.collectionarea }}</p>
                      </div>
                    </div>
                  </article>
                </template>
                <p v-else class="p-5 text-sm text-muted-foreground" role="status">
                  {{ queue.rows ? queue.empty : 'Queue preview unavailable.' }}
                </p>
                <div class="mt-auto px-5 pt-2.5 pb-5">
                  <Button asChild variant="outline">
                    <RouterLink :to="queue.view && record ? { ...queue.to, state: { ...queue.to.state, appointment: record.id } } : queue.to">
                      {{ queue.action }}
                      <HugeiconsIcon :icon="ArrowRight01Icon" class="size-4" aria-hidden="true" />
                    </RouterLink>
                  </Button>
                </div>
            </TabsContent>
          </div>
        </Tabs>
      </section>

      <section class="min-w-0 self-stretch overflow-hidden rounded-lg border" aria-labelledby="collections-title">
        <header class="flex flex-wrap items-center justify-between gap-2.5 border-b bg-primary p-5">
          <h2 id="collections-title">Today's pickups</h2>
          <Button asChild size="sm" variant="outline">
            <RouterLink :to="todayQueue.to" aria-label="View all today's pickups">View all</RouterLink>
          </Button>
        </header>
        <div v-if="loading" class="space-y-2.5 p-5" role="status" aria-label="Loading today's pickups">
          <Skeleton class="h-20" />
          <Skeleton class="h-4 w-2/3" />
        </div>
        <template v-else-if="pickups">
          <RouterLink v-for="(pickup, index) in pickups" :key="pickup.id"
            :to="{ name: 'adminAppointments', state: { view: 'today', appointment: pickup.id } }"
            class="block space-y-2.5 p-5 text-sm hover:bg-primary focus-visible:bg-primary focus-visible:inset-ring-2 focus-visible:inset-ring-muted-foreground"
            :class="index > 0 && 'border-t'"
            :aria-label="`View appointment for ${pickup.customer}: ${pickup.book?.title || pickup.booktitle || 'Untitled'}`">
            <div class="flex items-center gap-2.5">
              <BookIdentity class="flex-1" :title="pickup.book?.title || pickup.booktitle || 'Untitled'" :author="pickup.book?.authors?.join(', ') || 'Unknown author'" :cover="pickup.book?.coverurl" />
              <StatusBadge :status="pickup.status" class="shrink-0" />
            </div>
            <p>Customer: {{ pickup.customer }}</p>
            <p class="flex items-center justify-between gap-2.5">
              <span>Time/Location: {{ pickup.timeslot }} @ {{ pickup.location }}</span>
              <span class="grid size-9 shrink-0 place-items-center" aria-hidden="true">
                <HugeiconsIcon :icon="ArrowUpRight01Icon" class="size-5" aria-hidden="true" />
              </span>
            </p>
          </RouterLink>
          <p v-if="!pickups.length" class="p-5 text-sm text-muted-foreground">No pickups today.</p>
        </template>
      </section>
    </div>
  </section>
</template>
