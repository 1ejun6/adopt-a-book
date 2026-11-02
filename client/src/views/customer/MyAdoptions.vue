<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CustomerAdoptionCard from '@/components/customer/CustomerAdoptionCard.vue';
import CustomerBookDialogs from '@/components/customer/CustomerBookDialogs.vue';

const applications = ref([]);
const loading = ref(true);
const loadError = ref('');
const selectedTab = ref('active');
const dialogs = ref(null);
const router = useRouter();
const pendingStatuses = ['pending', 'pending review'];
const approvedStatuses = ['approved'];
const historyStatuses = ['rejected', 'withdrawn', 'cancelled', 'collected', 'completed'];

function getStatus(application) {
  return String(application.status ?? 'unknown').trim().toLowerCase().replace(/[_-]+/g, ' ') || 'unknown';
}

function getRequestDate(application) {
  return application.createdat || application.createdAt ||application.created_at || application.applicationdate || application.submitted_at || application.date;
}

function sortByDate(items) {
  return [...items].sort((a, b) => {
    const first = new Date(getRequestDate(a) || 0).getTime() || 0;
    const second = new Date(getRequestDate(b) || 0).getTime() || 0;
    return second - first;
  });
}

// ==================== APPLICATION FILTERS ====================
const activeApplications = computed(() => sortByDate(applications.value.filter(application =>
    !historyStatuses.includes(getStatus(application))
  ))
);

const approvedApplications = computed(() => activeApplications.value.filter(application =>
    approvedStatuses.includes(getStatus(application))
  )
);

const pendingApplications = computed(() => activeApplications.value.filter(application =>
    pendingStatuses.includes(getStatus(application))
  )
);

const otherActiveApplications = computed(() => activeApplications.value.filter(application =>
    !approvedStatuses.includes(getStatus(application)) &&
    !pendingStatuses.includes(getStatus(application))
  )
);

const historyApplications = computed(() => sortByDate(applications.value.filter(application =>
    historyStatuses.includes(getStatus(application))
  ))
);

// ==================== LOAD APPLICATIONS ====================
async function loadApplications() {
  loading.value = true;
  loadError.value = '';
  try {
    const response = await api('/applications', { method: 'GET' });
    if (!Array.isArray(response?.adoptionapplications)) {
      throw new Error('Unable to read adoption requests.');
    }
    applications.value = response.adoptionapplications;
  } catch (error) {
    console.error('Failed to load adoption applications:', error);
    loadError.value = error.message || 'Unable to load your adoption requests.';
    applications.value = [];
  } finally {
    loading.value = false;
  }
}

// ==================== BOOK PREVIEW ====================
function getBook(application) {
  const value = application.bookid || application.book;
  return value && typeof value === 'object' ? value : null;
}

function viewBook(application) {
  const book = getBook(application);
  if (book?.id) {
    dialogs.value?.openBookDetails(book, { viewOnly: true });
  }
}

// ==================== PICKUP NAVIGATION ====================
const pickupAvailable = computed(() =>
  router.getRoutes().some(route =>
    route.name === 'customerPickups' && Boolean(route.components?.default)
  )
);

function arrangePickup(application) {
  router.push({
    name: 'customerPickups',
    query: { application: String(application.id) }
  });
}

onMounted(loadApplications);
</script>

<template>
  <main class="mx-auto w-full max-w-7xl space-y-8">
    <!-- Page header -->
    <header class="border-b pb-6">
      <div class="space-y-2">
        <p class="text-xs uppercase tracking-widest text-muted-foreground">Your reading journey</p>
        <h1 class="font-heading text-4xl">My Adoptions</h1>
        <p class="text-muted-foreground">Track your adoption requests and see what happens next.</p>
      </div>
    </header>

    <!-- Loading and error feedback -->
    <p v-if="loading" role="status" class="text-sm text-muted-foreground">
      Loading your adoption requests...
    </p>
    <div v-else-if="loadError" class="space-y-3 rounded-xl border bg-card p-5">
      <p role="alert" class="text-sm text-destructive">{{ loadError }}</p>
      <Button variant="outline" @click="loadApplications">Try Again</Button>
    </div>

    <!-- Same tab components and styling as My Pickups -->
    <Tabs v-else v-model="selectedTab" class="gap-6">
      <TabsList aria-label="Adoption requests" class="justify-start border-b pb-3">
        <TabsTrigger value="active">Active ({{ activeApplications.length }})</TabsTrigger>
        <TabsTrigger value="history">Past ({{ historyApplications.length }})</TabsTrigger>
      </TabsList>

      <TabsContent value="active" class="space-y-10">
        <!-- Approved requests -->
        <section v-if="approvedApplications.length" class="space-y-4">
          <div class="space-y-1">
            <h2 class="font-heading text-2xl">Your Next Step</h2>
            <p class="text-sm text-muted-foreground">These adoption requests have been approved. Check your collection arrangements.</p>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <CustomerAdoptionCard v-for="application in approvedApplications" :key="application.id"
              :application="application" :showPickup="true" :pickupAvailable="pickupAvailable"
              @view="viewBook" @pickup="arrangePickup" />
          </div>
        </section>

        <!-- Requests awaiting review -->
        <section v-if="pendingApplications.length" class="space-y-4">
          <div class="space-y-1">
            <h2 class="font-heading text-2xl">Awaiting Approval</h2>
            <p class="text-sm text-muted-foreground">These requests are being reviewed. No action is needed from you right now.</p>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <CustomerAdoptionCard v-for="application in pendingApplications" :key="application.id"
              :application="application" @view="viewBook" />
          </div>
        </section>

        <!-- Additional active statuses -->
        <section v-if="otherActiveApplications.length" class="space-y-4">
          <div class="space-y-1">
            <h2 class="font-heading text-2xl">Other Updates</h2>
            <p class="text-sm text-muted-foreground">Additional updates about your ongoing adoption requests.</p>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <CustomerAdoptionCard v-for="application in otherActiveApplications" :key="application.id"
              :application="application" @view="viewBook" />
          </div>
        </section>

        <div v-if="!activeApplications.length" class="space-y-2 rounded-xl border bg-card p-10 text-center">
          <h2 class="font-heading text-2xl">No active requests yet</h2>
          <p class="text-sm text-muted-foreground">Your ongoing adoption requests will appear here once you request a book.</p>
        </div>
      </TabsContent>

      <TabsContent value="history" class="space-y-4">
        <div class="space-y-1">
          <h2 class="font-heading text-2xl">Adoption History</h2>
          <p class="text-sm text-muted-foreground">Your previous adoption requests and their final statuses.</p>
        </div>
        <div v-if="!historyApplications.length" class="space-y-2 rounded-xl border bg-card p-10 text-center">
          <h3 class="font-heading text-xl">No adoption history yet</h3>
          <p class="text-sm text-muted-foreground">Completed, rejected and withdrawn requests will appear here.</p>
        </div>
        <div v-else class="grid gap-4 md:grid-cols-2">
          <CustomerAdoptionCard v-for="application in historyApplications" :key="application.id"
            :application="application" @view="viewBook" />
        </div>
      </TabsContent>
    </Tabs>
    <CustomerBookDialogs ref="dialogs" />
  </main>
</template>