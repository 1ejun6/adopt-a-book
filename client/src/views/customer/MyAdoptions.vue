
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import CustomerAdoptionCard from '@/components/customer/CustomerAdoptionCard.vue';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';

// ==================== PAGE STATE ====================

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

// ==================== STATUS HELPERS ====================

//@sree-sanjana06 > application statuses used for filtering
const pendingStatuses = ['pending', 'pending review'];
const approvedStatuses = ['approved'];
const historyStatuses = [
  'rejected',
  'withdrawn',
  'cancelled',
  'collected',
  'completed'
];

//@sree-sanjana06 > standardise backend statuses before filtering
function getStatus(application) {
  return String(application.status ?? 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ') || 'unknown';
}

//@sree-sanjana06 > retrieve the request submission date
function getRequestDate(application) {
  return application.createdat ||
    application.createdAt ||
    application.created_at ||
    application.applicationdate ||
    application.submitted_at ||
    application.date;
}

//@sree-sanjana06 > sort adoption requests from newest to oldest
function sortByDate(items) {
  return [...items].sort((a, b) => {
    const first = new Date(getRequestDate(a) || 0).getTime() || 0;
    const second = new Date(getRequestDate(b) || 0).getTime() || 0;

    return second - first;
  });
}

// ==================== APPLICATION FILTERS ====================

//@sree-sanjana06 > requests that are still ongoing
const activeApplications = computed(() =>
  sortByDate(applications.value.filter(application =>
    !historyStatuses.includes(getStatus(application))
  ))
);

//@sree-sanjana06 > approved requests that require customer attention
const approvedApplications = computed(() =>
  activeApplications.value.filter(application =>
    approvedStatuses.includes(getStatus(application))
  )
);

//@sree-sanjana06 > pending requests waiting for administrator review
const pendingApplications = computed(() =>
  activeApplications.value.filter(application =>
    pendingStatuses.includes(getStatus(application))
  )
);

//@sree-sanjana06 > keep additional active statuses visible
const otherActiveApplications = computed(() =>
  activeApplications.value.filter(application =>
    !approvedStatuses.includes(getStatus(application)) &&
    !pendingStatuses.includes(getStatus(application))
  )
);

//@sree-sanjana06 > completed and unsuccessful adoption requests
const historyApplications = computed(() =>
  sortByDate(applications.value.filter(application =>
    historyStatuses.includes(getStatus(application))
  ))
);

// ==================== API ====================

//@sree-sanjana06 > extract application arrays from supported response structures
//@sree-sanjana06 > extract adoption applications using the actual backend response structure
function extractApplications(response) {
  if (!Array.isArray(response?.adoptionapplications)) {
    throw new Error('Unable to read adoption requests.');
  }

  return response.adoptionapplications;
}

//@sree-sanjana06 > fetch customer adoption requests using the existing API helper
async function loadApplications() {
  loading.value = true;
  loadError.value = '';

  try {
    const response = await api('/applications', {
      method: 'GET'
    });

    applications.value = extractApplications(response);
  } catch (error) {
    console.error('Failed to load adoption applications:', error);

    loadError.value =
      error.message || 'Unable to load your adoption requests.';

    applications.value = [];
  } finally {
    loading.value = false;
  }
}

// ==================== BOOK PREVIEW ====================

//@sree-sanjana06 > retrieve the populated book linked to an application
function getBook(application) {
  const value = application.bookid || application.book;

  return value && typeof value === 'object'
    ? value
    : null;
}

//@sree-sanjana06 > open existing adoption books in read-only mode
function viewBook(application) {
  const book = getBook(application);

  if (book?.id) {
    dialogs.value?.openBookDetails(book, { viewOnly: true });
  }
}

// ==================== PICKUP NAVIGATION ====================

//@sree-sanjana06 > only enable pickup navigation when its page is implemented
const pickupAvailable = computed(() =>
  router.getRoutes().some(route =>
    route.name === 'customerPickups' &&
    Boolean(route.components?.default)
  )
);

//@sree-sanjana06 > pass the selected application ID to the pickup page
function arrangePickup(application) {
  if (!pickupAvailable.value) return;

  router.push({
    name: 'customerPickups',
    query: {
      application: application.id
    }
  });
}

// ==================== INITIAL LOAD ====================

//@sree-sanjana06 > retrieve adoption requests when the customer opens this page
onMounted(loadApplications);
</script>

<template>
  <main class="mx-auto w-full max-w-7xl space-y-8">

    <!-- ==================== PAGE HEADER ==================== -->
    <!--@sree-sanjana06 > page heading without the redundant browse books button-->
    <header class="border-b pb-6">
      <div class="space-y-2">
        <p class="text-xs uppercase tracking-widest text-muted-foreground">Your reading journey</p>
        <h1 class="font-heading text-4xl">My Adoptions</h1>
        <p class="text-muted-foreground">Track your adoption requests and see what happens next.</p>
      </div>
    </header>

    <!-- ==================== ACTIVE / HISTORY TABS ==================== -->
    <!--@sree-sanjana06 > separate ongoing requests from adoption history-->
    <div class="flex gap-6 border-b" role="tablist" aria-label="Adoption requests">

      <button type="button" role="tab" :aria-selected="selectedTab === 'active'" :class="['border-b-2 px-1 pb-3 text-sm font-medium transition-colors', selectedTab === 'active' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground']" @click="selectedTab = 'active'">
        Active ({{ activeApplications.length }})
      </button>

      <button type="button" role="tab" :aria-selected="selectedTab === 'history'" :class="['border-b-2 px-1 pb-3 text-sm font-medium transition-colors', selectedTab === 'history' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground']" @click="selectedTab = 'history'">
        History ({{ historyApplications.length }})
      </button>

    </div>

    <!-- ==================== LOADING ==================== -->
    <!--@sree-sanjana06 > show loading feedback while retrieving applications-->
    <p v-if="loading" class="text-sm text-muted-foreground">Loading your adoption requests...</p>

    <!-- ==================== ERROR ==================== -->
    <!--@sree-sanjana06 > allow the customer to retry if the API request fails-->
    <div v-else-if="loadError" class="space-y-3 rounded-xl border bg-card p-5">
      <p class="text-sm text-destructive">{{ loadError }}</p>
      <Button variant="outline" @click="loadApplications">Try Again</Button>
    </div>

    <!-- ==================== ACTIVE REQUESTS ==================== -->
    <div v-else-if="selectedTab === 'active'" class="space-y-10">

      <!-- ==================== YOUR NEXT STEP ==================== -->
      <!--@sree-sanjana06 > approved requests that may require pickup arrangements-->
      <section v-if="approvedApplications.length" class="space-y-4">

        <div class="space-y-1">
          <h2 class="font-heading text-2xl">Your Next Step</h2>
          <p class="text-sm text-muted-foreground">These adoption requests have been approved. Check your collection arrangements.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <CustomerAdoptionCard v-for="application in approvedApplications" :key="application.id" :application="application" :showPickup="true" :pickupAvailable="pickupAvailable" @view="viewBook" @pickup="arrangePickup" />
        </div>

      </section>

      <!-- ==================== AWAITING APPROVAL ==================== -->
      <!--@sree-sanjana06 > pending requests awaiting administrator approval-->
      <section v-if="pendingApplications.length" class="space-y-4">

        <div class="space-y-1">
          <h2 class="font-heading text-2xl">Awaiting Approval</h2>
          <p class="text-sm text-muted-foreground">These requests are being reviewed. No action is needed from you right now.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <CustomerAdoptionCard v-for="application in pendingApplications" :key="application.id" :application="application" @view="viewBook" />
        </div>

      </section>

      <!-- ==================== OTHER ACTIVE UPDATES ==================== -->
      <!--@sree-sanjana06 > display other ongoing statuses returned by the backend-->
      <section v-if="otherActiveApplications.length" class="space-y-4">

        <div class="space-y-1">
          <h2 class="font-heading text-2xl">Other Updates</h2>
          <p class="text-sm text-muted-foreground">Additional updates about your ongoing adoption requests.</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <CustomerAdoptionCard v-for="application in otherActiveApplications" :key="application.id" :application="application" @view="viewBook" />
        </div>

      </section>

      <!-- ==================== EMPTY ACTIVE STATE ==================== -->
      <!--@sree-sanjana06 > show a message when the customer has no active requests-->
      <div v-if="!activeApplications.length" class="space-y-2 rounded-xl border bg-card p-10 text-center">
        <h2 class="font-heading text-2xl">No active requests yet</h2>
        <p class="text-sm text-muted-foreground">Your ongoing adoption requests will appear here once you request a book.</p>
      </div>

    </div>

    <!-- ==================== ADOPTION HISTORY ==================== -->
    <!--@sree-sanjana06 > display rejected, withdrawn and completed requests-->
    <section v-else class="space-y-4">

      <div class="space-y-1">
        <h2 class="font-heading text-2xl">Adoption History</h2>
        <p class="text-sm text-muted-foreground">Your previous adoption requests and their final statuses.</p>
      </div>

      <!--@sree-sanjana06 > empty state for customers without adoption history-->
      <div v-if="!historyApplications.length" class="space-y-2 rounded-xl border bg-card p-10 text-center">
        <h3 class="font-heading text-xl">No adoption history yet</h3>
        <p class="text-sm text-muted-foreground">Completed, rejected and withdrawn requests will appear here.</p>
      </div>

      <!--@sree-sanjana06 > reuse the same adoption card for historical requests-->
      <div v-else class="grid gap-4 md:grid-cols-2">
        <CustomerAdoptionCard v-for="application in historyApplications" :key="application.id" :application="application" @view="viewBook" />
      </div>

    </section>

    <!-- ==================== BOOK DETAILS DIALOG ==================== -->
    <!--@sree-sanjana06 > reuse the existing customer book preview popup-->
    <CustomerBookDialogs ref="dialogs" :watchlist="[]" />

  </main>
</template>
