<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import CustomerAdoptionCard from '@/components/customer/CustomerAdoptionCard.vue';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';
import CustomerPickupCard from '@/components/customer/CustomerPickupCard.vue';
import PickupBookingDialog from '@/components/customer/PickupBookingDialog.vue';

// Keep page state here; the booking dialog owns its form and submission.
const route = useRoute();
const applications = ref([]);
const appointments = ref([]);
const loading = ref(true);
const error = ref('');
const tab = ref('active');
const bookDialogs = ref(null);
const bookingOpen = ref(false);
const selectedApplication = ref(null);
const selectedAppointment = ref(null);
const cancelling = ref(null);
const busy = ref(false);
const cancelError = ref('');
const activeStatuses = ['pending confirmation', 'appointment confirmed'];
const active = computed(() => appointments.value.filter(item => activeStatuses.includes(item.status))
  .sort((a, b) => a.appointmentdate.localeCompare(b.appointmentdate) || a.timeslot.localeCompare(b.timeslot)));
const history = computed(() => appointments.value.filter(item => !activeStatuses.includes(item.status)));
const ready = computed(() => applications.value.filter(item => item.status === 'approved' && item.bookid?.id &&
  item.bookid.status === 'reserved' && !active.value.some(booking => booking.bookid === item.bookid.id)));
let handledApplication = '';

// Fetch both lists together so a failed request never looks like an empty list.
async function load() {
  loading.value = true;
  error.value = '';
  try {
    const [requests, bookings] = await Promise.all([
      api('/applications', { method: 'GET' }), api('/appointments', { method: 'GET' })
    ]);
    if (!Array.isArray(requests?.adoptionapplications) || !Array.isArray(bookings?.appointments)) {
      throw new Error('Unable to read your pickup arrangements.');
    }
    applications.value = requests.adoptionapplications;
    appointments.value = bookings.appointments;
    openLinkedApplication();
  } catch (failure) {
    error.value = failure.message;
  } finally {
    loading.value = false;
  }
}
function arrange(application, appointment = null) {
  selectedApplication.value = application;
  selectedAppointment.value = appointment;
  bookingOpen.value = true;
}
function applicationFor(appointment) {
  return applications.value.find(item => item.bookid?.id === appointment.bookid);
}
function viewBook(application) {
  if (application?.bookid?.id) bookDialogs.value?.openBookDetails(application.bookid, { viewOnly: true });
}
// My Adoptions passes an application ID; only eligible requests open a new proposal.
function openLinkedApplication() {
  const id = route.query.application;
  if (typeof id !== 'string' || id === handledApplication) return;
  handledApplication = id;
  tab.value = 'active';

  const application = applications.value.find(item => String(item.id) === id);
  if (!application) {
    toast.error('This adoption request could not be found.');
    return;
  }

  const appointment = active.value.find(
    item => item.bookid === application.bookid?.id
  );
  if (appointment) {
    arrange(application, appointment);
    return;
  }

  if (ready.value.some(item => String(item.id) === id)) {
    arrange(application);
    return;
  }
  toast.error('This request is not ready for pickup. It must be approved and the book reserved.');
}

watch(() => route.query.application, () => {
  handledApplication = '';
  if (!loading.value && !error.value) openLinkedApplication();
});
async function saved() {
  bookingOpen.value = false;
  toast.success('Pickup proposal sent. Please wait for confirmation.');
  await load();
}
function requestCancellation(appointment) {
  cancelError.value = '';
  cancelling.value = appointment;
}
async function cancelPickup() {
  if (busy.value || !cancelling.value) return;
  busy.value = true;
  cancelError.value = '';
  try {
    await api(`/appointments/${cancelling.value.id}`, { method: 'DELETE' });
    cancelling.value = null;
    toast.success('Pickup cancelled. You can propose another time.');
    await load();
  } catch (failure) {
    cancelError.value = failure.message;
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>

<template>
  <main class="mx-auto w-full max-w-7xl space-y-8">
    <header class="space-y-2 border-b pb-6">
      <p class="text-xs uppercase tracking-widest text-muted-foreground">Your reading journey</p>
      <h1 class="font-heading text-4xl">My Pickups</h1>
      <p class="text-muted-foreground">Arrange a collection time and track your pickup confirmations.</p>
    </header>
    <p v-if="loading" role="status" class="text-sm text-muted-foreground">Loading your pickups...</p>
    <div v-else-if="error" class="space-y-3 rounded-xl border bg-card p-5">
      <p role="alert" class="text-sm text-destructive">{{ error }}</p>
      <Button variant="outline" @click="load">Try Again</Button>
    </div>
    <Tabs v-else v-model="tab" class="gap-6">
      <TabsList aria-label="Pickup arrangements" class="justify-start border-b pb-3">
        <TabsTrigger value="active">Active ({{ active.length + ready.length }})</TabsTrigger>
        <TabsTrigger value="history">History ({{ history.length }})</TabsTrigger>
      </TabsList>
      <TabsContent value="active" class="space-y-10">
        <section v-if="ready.length" class="space-y-4">
          <div class="space-y-1">
            <h2 class="font-heading text-2xl">Ready to Arrange</h2>
            <p class="text-sm text-muted-foreground">Your requests are approved. Propose a time for the book owner or team to confirm.</p>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <CustomerAdoptionCard v-for="application in ready" :key="application.id" :application="application"
              show-pickup pickup-available @pickup="arrange" @view="viewBook" />
          </div>
        </section>
        <section v-if="active.length" class="space-y-4">
          <h2 class="font-heading text-2xl">Your Arrangements</h2>
          <div class="grid gap-4 md:grid-cols-2">
            <CustomerPickupCard v-for="appointment in active" :key="appointment.id" :appointment="appointment"
              :book="applicationFor(appointment)?.bookid" :busy="busy"
              @reschedule="arrange(applicationFor(appointment), appointment)" @cancel="requestCancellation(appointment)"
              @view="viewBook(applicationFor(appointment))" />
          </div>
        </section>
        <div v-if="!ready.length && !active.length" class="space-y-2 rounded-xl border bg-card p-10 text-center">
          <h2 class="font-heading text-2xl">No pickups to arrange yet</h2>
          <p class="text-sm text-muted-foreground">Approved adoption requests will appear here when they are ready for collection.</p>
          <Button as-child variant="outline"><RouterLink :to="{ name: 'customerAdoptions' }">My Adoptions</RouterLink></Button>
        </div>
      </TabsContent>
      <TabsContent value="history" class="space-y-4">
        <h2 class="font-heading text-2xl">Pickup History</h2>
        <p v-if="!history.length" class="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">Collected, cancelled and rejected pickups will appear here.</p>
        <div v-else class="grid gap-4 md:grid-cols-2">
          <CustomerPickupCard v-for="appointment in history" :key="appointment.id" :appointment="appointment"
            :book="applicationFor(appointment)?.bookid" @view="viewBook(applicationFor(appointment))" />
        </div>
      </TabsContent>
    </Tabs>
    <PickupBookingDialog v-model:open="bookingOpen" :application="selectedApplication" :appointment="selectedAppointment" @saved="saved" />
    <Dialog :open="!!cancelling" @update:open="value => { if (!value && !busy) cancelling = null; }">
      <DialogContent :show-close-button="!busy">
        <DialogHeader>
          <DialogTitle>Cancel this pickup?</DialogTitle>
          <DialogDescription>This cancels the appointment for {{ cancelling?.booktitle || 'this book' }}. Your approved adoption request stays available for a new proposal.</DialogDescription>
        </DialogHeader>
        <p v-if="cancelError" role="alert" class="px-5 text-sm text-destructive">{{ cancelError }}</p>
        <div class="flex flex-wrap justify-end gap-3 p-5">
          <Button variant="outline" :disabled="busy" @click="cancelling = null">Keep Pickup</Button>
          <Button variant="destructive" :disabled="busy" @click="cancelPickup">{{ busy ? 'Cancelling...' : 'Cancel Pickup' }}</Button>
        </div>
      </DialogContent>
    </Dialog>
    <CustomerBookDialogs ref="bookDialogs" />
  </main>
</template>