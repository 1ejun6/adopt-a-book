<script setup>
import AppPage from '@/components/shared/AppPage.vue';
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { getApplicationStatus, getApplicationDate, getApplicationBook } from '@/lib/adoptions';
import { Button } from '@/components/ui/button';
import CustomerAdoptionSection from '@/components/customer/CustomerAdoptionSection.vue';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';

//@sree-sanjana06 > customer adoption applications
const applications = ref([]);
//@sree-sanjana06 > loading and error states
const loading = ref(false);
const loadError = ref('');
//@sree-sanjana06 > control active and history tabs
const selectedTab = ref('active');
//@sree-sanjana06 > reuse existing book preview dialog and router
const dialogs = ref(null);
const router = useRouter();
//@sree-sanjana06 > application statuses used for filtering
const pendingStatuses = ['pending', 'pending review'];
const historyStatuses = ['rejected', 'withdrawn', 'cancelled', 'collected', 'completed'];

//@sree-sanjana06 > sort adoption requests from newest to oldest
function sortByDate(items) {
  return [...items].sort((a, b) => {
    const first = new Date(getApplicationDate(a) || 0).getTime() || 0;
    const second = new Date(getApplicationDate(b) || 0).getTime() || 0;
    return second - first;
  });
}

//@sree-sanjana06 > requests that are still ongoing
const activeApplications = computed(() =>
  sortByDate(applications.value.filter(application => !historyStatuses.includes(getApplicationStatus(application))))
);
//@sree-sanjana06 > completed and unsuccessful adoption requests
const historyApplications = computed(() =>
  sortByDate(applications.value.filter(application => historyStatuses.includes(getApplicationStatus(application))))
);
const activeSections = computed(() => [
  //@sree-sanjana06 > approved requests that require customer attention
  //@sree-sanjana06 > approved requests that may require pickup arrangements
  {
    title: 'Your Next Step',
    description: 'these adoption requests have been approved check your collection arrangements',
    applications: activeApplications.value.filter(application => getApplicationStatus(application) === 'approved'),
    showPickup: true,
  },
  //@sree-sanjana06 > pending requests waiting for administrator review
  //@sree-sanjana06 > pending requests awaiting administrator approval
  {
    title: 'Awaiting Approval',
    description: 'these requests are being reviewed no action is needed from you right now',
    applications: activeApplications.value.filter(application => pendingStatuses.includes(getApplicationStatus(application))),
  },
  //@sree-sanjana06 > keep additional active statuses visible
  //@sree-sanjana06 > display other ongoing statuses returned by the backend
  {
    title: 'Other Updates',
    description: 'additional updates about your ongoing adoption requests',
    applications: activeApplications.value.filter(application =>
      getApplicationStatus(application) !== 'approved' && !pendingStatuses.includes(getApplicationStatus(application))),
  },
].filter(section => section.applications.length));

//@sree-sanjana06 > fetch customer adoption requests using the existing API helper
async function loadApplications() {
  loading.value = true;
  loadError.value = '';
  try {
    const response = await api('/applications', { method: 'GET' });
    //@sree-sanjana06 > extract application arrays from supported response structures
    //@sree-sanjana06 > extract adoption applications using the actual backend response structure
    if (!Array.isArray(response?.adoptionapplications)) throw new Error('Unable to read adoption requests.');
    applications.value = response.adoptionapplications;
  } catch (error) {
    console.error('Failed to load adoption applications:', error);
    loadError.value = error.message || 'Unable to load your adoption requests.';
    applications.value = [];
  } finally {
    loading.value = false;
  }
}

//@sree-sanjana06 > open existing adoption books in read-only mode
function viewBook(application) {
  const book = getApplicationBook(application);
  if (book?.id) {
    dialogs.value?.openBookDetails(book, { viewOnly: true });
  }
}

// Pickup navigation stays disabled until a routed pickup view exists.
//@sree-sanjana06 > only enable pickup navigation when its page is implemented
const pickupAvailable = computed(() =>
  router.getRoutes().some(route => route.name === 'customerPickups' && Boolean(route.components?.default))
);

//@sree-sanjana06 > pass the selected application ID to the pickup page
function arrangePickup(application) {
  if (!pickupAvailable.value) return;
  router.push({ name: 'customerPickups', query: { application: application.id } });
}

//@sree-sanjana06 > retrieve adoption requests when the customer opens this page
onMounted(loadApplications);
</script>

<template>
  <AppPage class="space-y-8">
    <!--@sree-sanjana06 > page heading without the redundant browse books button-->
    <header>
      <div class="space-y-2">
        <p class="text-sm text-muted-foreground">your reading journey</p>
        <h1 class="text-4xl">My Adoptions</h1>
        <p class="text-muted-foreground text-sm">track your adoption requests and see what happens next</p>
      </div>
    </header>

    <!--@sree-sanjana06 > separate ongoing requests from adoption history-->
    <div class="flex gap-6" role="tablist">
      <button type="button" role="tab" :aria-selected="selectedTab === 'active'"
        :class="['border-b-2 px-1 pb-3 text-sm font-medium', selectedTab === 'active' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground']"
        @click="selectedTab = 'active'">
        Active ({{ activeApplications.length }})
      </button>
      <button type="button" role="tab" :aria-selected="selectedTab === 'history'"
        :class="['border-b-2 px-1 pb-3 text-sm font-medium', selectedTab === 'history' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground']"
        @click="selectedTab = 'history'">
        History ({{ historyApplications.length }})
      </button>
    </div>

    <!--@sree-sanjana06 > show loading feedback while retrieving applications-->
    <p v-if="loading" class="text-sm text-muted-foreground">loading your adoption requests..</p>
    <!--@sree-sanjana06 > allow the customer to retry if the API request fails-->
    <div v-else-if="loadError" class="space-y-3 rounded-xl border bg-card p-5">
      <p class="text-sm text-destructive">{{ loadError }}</p>
      <Button variant="outline" @click="loadApplications">Try Again</Button>
    </div>
    <div v-else-if="selectedTab === 'active'" class="space-y-10">
      <CustomerAdoptionSection v-for="section in activeSections" :key="section.title" v-bind="section"
        :pickupAvailable="pickupAvailable" @view="viewBook" @pickup="arrangePickup" />
      <!--@sree-sanjana06 > show a message when the customer has no active requests-->
      <div v-if="!activeApplications.length" class="space-y-2 rounded-xl border bg-card p-10 text-center">
        <h2>No active requests yet</h2>
        <p class="text-sm text-muted-foreground">your ongoing adoption requests will appear here once you request a
          book</p>
      </div>
    </div>
    <!--@sree-sanjana06 > display rejected, withdrawn and completed requests-->
    <!--@sree-sanjana06 > empty state for customers without adoption history-->
    <!--@sree-sanjana06 > reuse the same adoption card for historical requests-->
    <CustomerAdoptionSection v-else title="Adoption History"
      description="your previous adoption requests and their final statuses" :applications="historyApplications"
      emptyTitle="No adoption history yet"
      emptyDescription="completed, rejected and withdrawn requests will appear here" @view="viewBook" />

    <!--@sree-sanjana06 > reuse the existing customer book preview popup-->
    <CustomerBookDialogs ref="dialogs" />
  </AppPage>
</template>
