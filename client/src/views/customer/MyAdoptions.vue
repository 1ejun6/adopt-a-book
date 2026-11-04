<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  RouterLink,
  useRoute,
  useRouter,
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
} from 'vue-router';
import AppPage from '@/components/shared/AppPage.vue';
import AppPagination from '@/components/shared/AppPagination.vue';
import AppSearchInput from '@/components/shared/AppSearchInput.vue';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import CustomerAdoptionStageTabs from '@/components/customer/CustomerAdoptionStageTabs.vue';
import CustomerStatusTabs from '@/components/customer/CustomerStatusTabs.vue';
import CustomerAdoptionCard from '@/components/customer/CustomerAdoptionCard.vue';
import CustomerPickupCard from '@/components/customer/CustomerPickupCard.vue';
import CustomerAdoptionDialog from '@/components/customer/CustomerAdoptionDialog.vue';
import CustomerAdoptionTaskGroup from '@/components/customer/CustomerAdoptionTaskGroup.vue';
import { api } from '@/lib/api';
import {
  actionPriority,
  activeAdoptionStages,
  adoptionStage,
  adoptionJourneys,
  adoptionSection,
  canManagePickup,
  bookAuthors,
  journeyTabs,
  getApplicationDate,
  getApplicationStatus,
  validPickupDate,
  recordId,
} from '@/lib/adoptions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent } from '@/components/ui/tabs';

const route = useRoute();
const router = useRouter();
const applications = ref([]);
const appointments = ref([]);
const loading = ref(true);
const loadError = ref('');
const pickupError = ref('');
const pickupsReady = ref(false);
const loaded = ref(false);
let controller;
let requestId = 0;

// check both sources before allowing a collection request
async function refresh() {
  controller?.abort();
  const request = new AbortController();
  const id = ++requestId;
  controller = request;
  loading.value = true;
  loadError.value = '';
  pickupError.value = '';
  const [requests, pickups] = await Promise.allSettled([
    api('/applications', { method: 'GET', signal: request.signal }),
    api('/appointments', { method: 'GET', signal: request.signal }),
  ]);
  if (request.signal.aborted || id !== requestId) {
    return false;
  }
  if (requests.status === 'fulfilled' && Array.isArray(requests.value?.adoptionapplications)) {
    applications.value = requests.value.adoptionapplications;
  } else {
    loadError.value =
      requests.status === 'rejected'
        ? requests.reason.message
        : 'Could not read your adoption requests.';
  }
  pickupsReady.value = pickups.status === 'fulfilled' && Array.isArray(pickups.value?.appointments);
  if (pickupsReady.value) {
    appointments.value = pickups.value.appointments;
  } else {
    pickupError.value =
      pickups.status === 'rejected' ? pickups.reason.message : 'Could not read your pickups.';
  }
  loaded.value ||= !loadError.value;
  loading.value = false;
  return !loadError.value && pickupsReady.value;
}
const records = computed(() =>
  adoptionJourneys(applications.value, appointments.value, pickupsReady.value),
);
const entries = computed(() => {
  const linked = new Set();
  const result = records.value.map((record) => {
    record.pickups.forEach((appointment) => linked.add(recordId(appointment)));
    return { id: `request-${record.id}`, kind: 'request', record };
  });
  for (const appointment of appointments.value) {
    if (!linked.has(recordId(appointment))) {
      result.push({ id: `pickup-${recordId(appointment)}`, kind: 'unlinked', appointment });
    }
  }
  return result;
});
const entryDate = (entry) =>
  Date.parse(
    entry.kind === 'request'
      ? getApplicationDate(entry.record.application)
      : entry.appointment.createdat,
  ) || 0;
function entrySection(entry) {
  if (entry.kind === 'request') return adoptionSection(entry.record);
  return ['collected', 'cancelled', 'rejected'].includes(getApplicationStatus(entry.appointment))
    ? 'history'
    : 'active';
}
const groups = computed(() => {
  const result = { active: [], history: [] };
  for (const entry of entries.value) result[entrySection(entry)].push(entry);
  const stable = (a, b) => a.id.localeCompare(b.id);
  result.active.sort((a, b) => {
    const priority = (entry) => (entry.kind === 'unlinked' ? 0 : actionPriority(entry.record));
    const order = priority(a) - priority(b);
    if (order) return order;
    if (priority(a) === 2) {
      const pickupDate = (entry) =>
        validPickupDate(entry.record.appointment.appointmentdate)
          ? entry.record.appointment.appointmentdate
          : '9999';
      const dates = pickupDate(a).localeCompare(pickupDate(b));
      const time = (entry) =>
        /^([01]\d|2[0-3]):[0-5]\d/.test(entry.record.appointment.timeslot || '')
          ? entry.record.appointment.timeslot.slice(0, 5)
          : '99:99';
      return dates || time(a).localeCompare(time(b)) || stable(a, b);
    }
    return entryDate(b) - entryDate(a) || stable(a, b);
  });
  result.history.sort((a, b) => entryDate(b) - entryDate(a) || stable(a, b));
  return result;
});
const counts = computed(() =>
  Object.fromEntries(journeyTabs.map((item) => [item.value, groups.value[item.value].length])),
);
const stageValues = activeAdoptionStages.map((item) => item.value);
function entryStage(entry) {
  return entry.kind === 'unlinked' ? 'needs-action' : adoptionStage(entry.record);
}
const stageGroups = computed(() => {
  const result = { 'needs-action': [], waiting: [], pickups: [], all: groups.value.active };
  for (const entry of groups.value.active) result[entryStage(entry)].push(entry);
  return result;
});
const stageCounts = computed(() =>
  Object.fromEntries(
    activeAdoptionStages.map((item) => [item.value, stageGroups.value[item.value].length]),
  ),
);
const defaultStage = computed(
  () => ['needs-action', 'pickups', 'waiting'].find((value) => stageCounts.value[value]) || 'all',
);
const rememberedStage = ref('');
const stage = computed({
  get: () => {
    if (stageValues.includes(route.query.stage)) return route.query.stage;
    const legacy = [route.query.tab, route.query.section, route.query.view, route.query.status];
    if (legacy.some((value) => ['pickups', 'confirmed', 'collections'].includes(value)))
      return 'pickups';
    if (legacy.some((value) => ['actions', 'next'].includes(value))) return 'needs-action';
    if (legacy.includes('waiting')) return 'waiting';
    return rememberedStage.value || defaultStage.value;
  },
  set: (value) => selectStage(value),
});
watch(
  () => [route.query.stage, routeTab()],
  ([value, section]) => {
    if (stageValues.includes(value)) rememberedStage.value = value;
    else if (section === 'active') rememberedStage.value = '';
  },
  { immediate: true },
);
function activePageKey(value = stage.value) {
  return `active:${value}`;
}
function normaliseTab(value) {
  if (value === 'history') return 'history';
  if (
    [
      'active',
      'requests',
      'pickups',
      'confirmed',
      'collections',
      'actions',
      'waiting',
      'next',
    ].includes(value)
  )
    return 'active';
  return '';
}
function routeTab() {
  for (const value of [
    route.query.tab,
    route.query.section,
    route.query.view,
    route.query.status,
  ]) {
    const result = normaliseTab(value);
    if (result) return result;
  }
  return 'active';
}
const tab = computed({ get: routeTab, set: (value) => selectTab(value) });
const rememberedPages = { history: 1, search: 1 };
const pageSize = 10;
let searchOrigin = null;
let internalNavigation = false;
function normalisedQuery(changes = {}, consumeAction = false) {
  const query = { ...route.query, tab: tab.value, ...changes };
  for (const key of ['view', 'status', 'layout', 'section', 'filter']) delete query[key];
  if (query.tab === 'active') {
    query.stage = stageValues.includes(query.stage) ? query.stage : stage.value;
    if (query.stage === defaultStage.value) delete query.stage;
    delete query.tab;
  } else delete query.stage;
  if (consumeAction) {
    for (const key of ['request', 'application', 'appointment', 'edit']) delete query[key];
  }
  for (const key of Object.keys(query)) {
    if (
      query[key] === undefined ||
      query[key] === '' ||
      (key === 'page' && Number(query[key]) === 1)
    )
      delete query[key];
  }
  return query;
}
async function updateQuery(changes, replace = false, consumeAction = false) {
  const query = normalisedQuery(changes, consumeAction);
  internalNavigation = true;
  try {
    return await router[replace ? 'replace' : 'push']({ query, hash: route.hash });
  } finally {
    internalNavigation = false;
  }
}
const search = computed({
  get: () => (typeof route.query.search === 'string' ? route.query.search : ''),
  set: async (value) => {
    if (value.trim() && !search.value.trim())
      searchOrigin = { query: { ...route.query }, scroll: window.scrollY };
    if (!value.trim() && searchOrigin) {
      const origin = searchOrigin;
      searchOrigin = null;
      await router.replace({ query: origin.query });
      await nextTick();
      window.scrollTo({ top: origin.scroll });
      return;
    }
    await updateQuery(
      {
        search: value.trim() ? value : undefined,
        page: value.trim()
          ? undefined
          : String(rememberedPages[tab.value === 'active' ? activePageKey() : tab.value] || 1),
      },
      true,
      true,
    );
  },
});
const searching = computed(() => !!search.value.trim());
const pageKey = computed(() =>
  searching.value ? 'search' : tab.value === 'active' ? activePageKey() : tab.value,
);
const page = computed({
  get: () => {
    const value = Number(route.query.page);
    return Number.isSafeInteger(value) && value > 0 ? value : 1;
  },
  set: async (value) => {
    await updateQuery({ page: String(value) });
    await nextTick();
    document.getElementById('adoption-list-title')?.focus({ preventScroll: true });
    document.getElementById('adoption-list-title')?.scrollIntoView({ block: 'start' });
  },
});
watch(
  [pageKey, page],
  ([key, value]) => {
    rememberedPages[key] = value;
  },
  { immediate: true },
);
async function selectTab(value, replace = false) {
  const selected = normaliseTab(value);
  if (!selected) return;
  searchOrigin = null;
  return updateQuery(
    {
      tab: selected,
      stage: selected === 'active' ? stage.value : undefined,
      search: undefined,
      page: String(rememberedPages[selected === 'active' ? activePageKey() : selected] || 1),
    },
    replace,
    true,
  );
}
async function selectStage(value) {
  if (!stageValues.includes(value)) return;
  searchOrigin = null;
  await updateQuery(
    {
      tab: 'active',
      stage: value,
      search: undefined,
      page: String(rememberedPages[activePageKey(value)] || 1),
    },
    false,
    true,
  );
}
function matchesSearch(entry, query = search.value.trim().toLocaleLowerCase()) {
  if (!query) return true;
  const book = entry.kind === 'request' ? entry.record.book : null;
  const title = book?.title || entry.appointment?.booktitle || '';
  const references =
    entry.kind === 'unlinked'
      ? [recordId(entry.appointment)]
      : [entry.record.id, ...entry.record.pickups.map(recordId)];
  return (
    `${title} ${book ? bookAuthors(book) : ''}`.toLocaleLowerCase().includes(query) ||
    references.some((id) => String(id).toLocaleLowerCase() === query)
  );
}
const filtered = computed(() =>
  (searching.value
    ? [...entries.value].sort((a, b) => entryDate(b) - entryDate(a) || a.id.localeCompare(b.id))
    : tab.value === 'active'
      ? stageGroups.value[stage.value]
      : groups.value.history
  ).filter((entry) => matchesSearch(entry)),
);
const paged = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
);
const overdueCount = computed(
  () =>
    paged.value.filter(
      (entry) => entry.kind === 'request' && entry.record.warning === 'Pickup date has passed',
    ).length,
);
function entryTask(entry) {
  if (entry.kind === 'unlinked') return 'unlinked';
  if (entry.record.warning === 'Pickup date has passed') return 'past';
  if (actionPriority(entry.record) === 0) return 'check';
  if (entry.record.canArrange) return 'arrange';
  if (entry.record.code === 'pickup confirmed') return 'confirmed';
  if (entry.record.code === 'pickup requested') return 'confirmation';
  if (['pending', 'pending review'].includes(entry.record.code)) return 'review';
  return 'check';
}
const taskGroups = computed(() => {
  let definitions;
  if (searching.value) {
    definitions = [
      { key: 'active', title: 'Active', matches: (entry) => entrySection(entry) === 'active' },
      { key: 'history', title: 'History', matches: (entry) => entrySection(entry) === 'history' },
    ];
  } else if (tab.value === 'history') {
    definitions = [{ key: 'history', title: '', matches: () => true }];
  } else {
    definitions = [
      {
        key: 'past',
        title: 'Check your pickup',
        description: 'These dates have passed. Check with the team before travelling.',
      },
      {
        key: 'check',
        title: 'Check these details',
        description: 'Some information needs checking. Open a book to see what needs attention.',
      },
      {
        key: 'unlinked',
        title: 'Pickup records to check',
        description:
          'These pickups couldn’t be linked to a book request. Check the details with the team.',
      },
      {
        key: 'arrange',
        title: 'Arrange a pickup',
        description: 'Your book is approved. Choose a preferred meeting point and time.',
      },
      {
        key: 'confirmed',
        title: 'Your confirmed pickups',
        description:
          'Your time and meeting point are confirmed. Open a book to view or change them.',
      },
      {
        key: 'confirmation',
        title: 'Waiting for pickup confirmation',
        description:
          'The team is checking your preferred time. Wait for confirmation before travelling.',
      },
      {
        key: 'review',
        title: 'Waiting for book approval',
        description: 'No action needed yet. You can arrange pickup once your request is approved.',
      },
    ].map((group) => ({ ...group, matches: (entry) => entryTask(entry) === group.key }));
  }
  return definitions
    .map((group) => ({
      ...group,
      entries: paged.value.filter(group.matches),
    }))
    .filter((group) => group.entries.length);
});
const listHint = computed(() => {
  if (searching.value && overdueCount.value)
    return 'Past pickup dates are marked below. Check with the team before travelling.';
  if (searching.value) return '';
  if (tab.value === 'history') return 'Collected books and requests that have ended.';
  return '';
});
const maxPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const hasUnlinked = computed(() => filtered.value.some((entry) => entry.kind === 'unlinked'));
const listTitle = computed(() =>
  searching.value
    ? 'Search results'
    : tab.value === 'history'
      ? 'History'
      : {
          'needs-action': 'Your next steps',
          waiting: 'Waiting for the team',
          pickups: 'Your confirmed pickups',
          all: 'All your current adoptions',
        }[stage.value],
);
watch([maxPage, page, loading], ([max, current, busy]) => {
  if (!busy && !loadError.value && current > max) updateQuery({ page: String(max) }, true);
});
async function revealRecord(record, preserve = false) {
  const selected = adoptionSection(record);
  const entry = entries.value.find(
    (item) => item.kind === 'request' && item.record.id === record.id,
  );
  if (preserve && searching.value && entry && matchesSearch(entry)) {
    const index = filtered.value.findIndex((item) => item.id === entry.id);
    await updateQuery({ page: String(Math.floor(Math.max(0, index) / pageSize) + 1) }, true, true);
    return;
  }
  const selectedStage =
    preserve && tab.value === 'active' && stage.value === 'all'
      ? 'all'
      : entry
        ? entryStage(entry)
        : 'needs-action';
  const source = selected === 'active' ? stageGroups.value[selectedStage] : groups.value.history;
  const index = source.findIndex((item) => item.kind === 'request' && item.record.id === record.id);
  searchOrigin = null;
  await updateQuery(
    {
      tab: selected,
      stage: selected === 'active' ? selectedStage : undefined,
      search: undefined,
      page: String(Math.floor(Math.max(0, index) / pageSize) + 1),
    },
    true,
    true,
  );
}

const titleNode = ref(null);
const adoptionDialog = ref(null);
const dialogOpen = ref(false);
const context = ref({ recordId: '', appointmentId: '', initialMode: 'adoption' });
const routeNotice = ref('');
const updateAnnouncement = ref('');
let dialogTrigger = null;
let originScroll = 0;
let dialogChanged = false;
let triggerRecordId = '';
const selectedRecord = computed(
  () => records.value.find((record) => record.id === context.value.recordId) || null,
);
const selectedAppointment = computed(
  () => appointments.value.find((item) => recordId(item) === context.value.appointmentId) || null,
);
function relatedRecord(appointment) {
  return (
    records.value.find((record) =>
      record.pickups.some((item) => recordId(item) === recordId(appointment)),
    ) || null
  );
}
function captureContext(id) {
  routeNotice.value = '';
  if (!dialogOpen.value) {
    dialogTrigger = document.activeElement;
    originScroll = window.scrollY;
    dialogChanged = false;
  }
  triggerRecordId = id;
}
function focusRecord(id) {
  const card = document.getElementById(`adoption-${id}`);
  if (!card || card.offsetParent === null) return false;
  const target = card.matches('button') ? card : card.querySelector('button');
  target?.focus({ preventScroll: true });
  card.scrollIntoView({ block: 'nearest' });
  return true;
}
function restoreFocus(event) {
  event.preventDefault();
  if (dialogChanged) {
    updateAnnouncement.value = '';
    nextTick(() => {
      updateAnnouncement.value = 'Your updated adoption is shown.';
    });
    if (!focusRecord(triggerRecordId)) document.getElementById('adoption-list-title')?.focus();
    return;
  }
  window.scrollTo({ top: originScroll });
  if (dialogTrigger?.isConnected && dialogTrigger.offsetParent !== null)
    dialogTrigger.focus({ preventScroll: true });
  else if (!focusRecord(triggerRecordId)) titleNode.value?.focus();
}
function showDetails(record) {
  captureContext(record.id);
  context.value = {
    recordId: record.id,
    appointmentId: recordId(record.appointment),
    initialMode: 'adoption',
  };
  dialogOpen.value = true;
}
function arrange(record) {
  if (!record.canArrange || !pickupsReady.value || loading.value || loadError.value) return;
  captureContext(record.id);
  context.value = { recordId: record.id, appointmentId: '', initialMode: 'create' };
  dialogOpen.value = true;
}
function showAppointment(appointment, edit = false) {
  const record = relatedRecord(appointment);
  captureContext(record?.id || `pickup-${recordId(appointment)}`);
  context.value = {
    recordId: record?.id || '',
    appointmentId: recordId(appointment),
    initialMode: edit && canManagePickup(record, appointment) ? 'edit' : 'view',
  };
  dialogOpen.value = true;
}
function showPickup(record) {
  if (record.canArrange) return arrange(record);
  if (record.appointment) return showAppointment(record.appointment);
}
async function withdrawn(id, reload = true) {
  applications.value = applications.value.map((application) =>
    recordId(application) === id ? { ...application, status: 'cancelled' } : application,
  );
  const ready = reload ? await refresh() : !loadError.value && pickupsReady.value;
  const record = records.value.find((item) => item.id === id);
  if (record) await revealRecord(record, true);
  else await selectTab('history', true);
  dialogChanged = true;
  return ready;
}
async function viewHistory() {
  if (selectedRecord.value) await revealRecord(selectedRecord.value);
  else await selectTab('history', true);
  dialogOpen.value = false;
}
async function reconcilePickup() {
  const ready = await refresh();
  return { ready, record: selectedRecord.value, appointments: appointments.value };
}
async function changed(appointment, reload = true) {
  if (appointment && recordId(appointment)) {
    appointments.value = [
      ...appointments.value.filter((item) => recordId(item) !== recordId(appointment)),
      appointment,
    ];
    context.value.appointmentId = recordId(appointment);
  }
  const ready = reload ? await refresh() : !loadError.value && pickupsReady.value;
  const record = records.value.find((item) => item.id === context.value.recordId);
  if (record) await revealRecord(record, true);
  dialogChanged = true;
  return ready;
}
async function canNavigate() {
  if (internalNavigation) return true;
  return (await adoptionDialog.value?.canNavigate()) !== false;
}
onBeforeRouteLeave(canNavigate);
onBeforeRouteUpdate(canNavigate);
let handledLink = '';
watch([loading, () => route.fullPath], async () => {
  if (loading.value || loadError.value) return;
  const request = typeof route.query.request === 'string' ? route.query.request : '';
  const application = typeof route.query.application === 'string' ? route.query.application : '';
  const appointmentId = typeof route.query.appointment === 'string' ? route.query.appointment : '';
  const key = `${request}|${application}|${appointmentId}|${route.query.edit || ''}`;
  if (!request && !application && !appointmentId) {
    handledLink = '';
    const query = normalisedQuery({ page: String(Math.min(page.value, maxPage.value)) });
    if (Object.keys({ ...route.query, ...query }).some((key) => route.query[key] !== query[key])) {
      await updateQuery({ page: String(Math.min(page.value, maxPage.value)) }, true);
    }
    return;
  }
  if (key === handledLink || ((application || appointmentId) && !pickupsReady.value)) return;
  handledLink = key;
  if (appointmentId) {
    const appointment = appointments.value.find((item) => recordId(item) === appointmentId);
    if (appointment) {
      const record = relatedRecord(appointment);
      const edit = route.query.edit === 'true';
      if (record) await revealRecord(record);
      else {
        const entry = entries.value.find(
          (item) => item.kind === 'unlinked' && recordId(item.appointment) === appointmentId,
        );
        const section = entrySection(entry);
        const source =
          section === 'active' ? stageGroups.value['needs-action'] : groups.value.history;
        const index = source.findIndex((item) => item === entry);
        await updateQuery(
          {
            tab: section,
            stage: section === 'active' ? 'needs-action' : undefined,
            search: undefined,
            page: String(Math.floor(Math.max(0, index) / pageSize) + 1),
          },
          true,
          true,
        );
      }
      showAppointment(appointment, edit);
      return;
    }
  } else {
    const record = records.value.find((item) => item.id === (request || application));
    if (record) {
      const edit = route.query.edit === 'true';
      await revealRecord(record);
      if (application && record.canArrange) arrange(record);
      else if (record.appointment && (application || edit))
        showAppointment(record.appointment, edit);
      else showDetails(record);
      return;
    }
  }
  routeNotice.value =
    'That adoption or pickup could not be found. Your current records are shown below.';
  await selectTab(tab.value, true);
});
const emptyStageTarget = computed(() =>
  ['needs-action', 'pickups', 'waiting'].find(
    (value) => value !== stage.value && stageCounts.value[value],
  ),
);
const emptyStageAction = computed(
  () =>
    ({
      'needs-action': 'View books needing action',
      pickups: 'View pickups',
      waiting: 'View waiting requests',
    })[emptyStageTarget.value],
);
const emptyPickups = computed(
  () =>
    !searching.value && !pickupError.value && tab.value === 'active' && stage.value === 'pickups',
);
const emptyCopy = computed(() => {
  if (searching.value)
    return ['No matching results', 'Try a different title, author or reference number.'];
  if (pickupError.value)
    return [
      'Pickup status unavailable',
      'Retry pickup information before arranging a collection or travelling.',
    ];
  if (tab.value === 'history')
    return ['No history yet', 'Collected books and requests that have ended will appear here.'];
  if (stage.value === 'needs-action')
    return [
      'Nothing to do right now',
      'Check Waiting for requests under review, or Pickups for confirmed collections.',
    ];
  if (stage.value === 'waiting')
    return [
      'No requests awaiting a response',
      'Requests appear here while the team reviews a book request or confirms a pickup.',
    ];
  if (stage.value === 'pickups')
    return [
      'No confirmed pickups',
      'Once a pickup is confirmed, its time and location appear here.',
    ];
  return [
    'No active adoptions',
    'Find a book you’d like to adopt. Follow your request and arrange pickup here.',
  ];
});
onMounted(refresh);
onBeforeUnmount(() => {
  requestId++;
  controller?.abort();
});
</script>

<template>
  <AppPage class="space-y-5" aria-labelledby="adoptions-title">
    <header class="space-y-2 text-center">
      <h1 id="adoptions-title" ref="titleNode" tabindex="-1" class="text-4xl sm:text-[42px]">
        My Adoptions
      </h1>
    </header>
    <p class="sr-only" role="status">{{ updateAnnouncement }}</p>
    <p v-if="routeNotice" class="rounded-lg border p-4 text-sm" role="status">{{ routeNotice }}</p>
    <Tabs v-model="tab" class="gap-3">
      <CustomerStatusTabs
        id="journey-tabs"
        :counts="counts"
        :showCounts="!loading && !loadError && !pickupError"
      />
      <TabsContent :value="tab" class="space-y-3">
        <component
          :is="tab === 'active' ? Tabs : 'div'"
          :modelValue="tab === 'active' ? stage : undefined"
          @update:modelValue="stage = $event"
          class="space-y-3"
        >
          <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CustomerAdoptionStageTabs
              v-if="tab === 'active' && !searching"
              :counts="stageCounts"
              :showCounts="!loading && !loadError && !pickupError"
              class="sm:flex-1"
            />
            <AppSearchInput
              id="adoption-search"
              v-model="search"
              placeholder="Find a book"
              aria-label="Search all adoptions"
              :disabled="(!loaded && loading) || !!loadError"
              class="w-full sm:ml-auto sm:w-64"
            />
          </div>
          <div v-if="searching" class="text-xs text-muted-foreground">
            <button
              type="button"
              class="min-h-11 underline underline-offset-4"
              @click="search = ''"
            >
              Back to {{ tab === 'active' ? 'Active' : 'History' }}
            </button>
          </div>
          <div v-if="loading && !loaded" class="space-y-3" role="status" aria-busy="true">
            <span class="sr-only">Loading your adoptions</span>
            <div
              v-for="i in 3"
              :key="i"
              class="grid gap-4 rounded-xl border p-4 sm:grid-cols-2 sm:p-5"
            >
              <AppBookIdentity loading coverClass="w-12" />
              <div class="space-y-2.5">
                <Skeleton class="h-5 w-32" /><Skeleton class="h-4 w-full" />
              </div>
            </div>
          </div>
          <div
            v-else-if="loadError && !loaded"
            class="space-y-4 rounded-xl border bg-card p-5"
            role="alert"
          >
            <h2>We couldn’t load your adoptions</h2>
            <p class="text-sm">{{ loadError }}</p>
            <Button type="button" variant="outline"  @click="refresh"
              >Try again</Button
            >
          </div>
          <template v-else>
            <p v-if="loading" role="status" class="text-sm">Checking for updates…</p>
            <div v-if="loadError" role="alert" class="space-y-2 rounded-lg border p-4 text-sm">
              <p>
                We couldn’t refresh your adoptions. Previously loaded records are shown. Check
                updates before making changes.
              </p>
              <Button variant="outline"  @click="refresh">Try again</Button>
            </div>
            <div
              v-if="pickupError"
              class="space-y-2 rounded-lg bg-badge-amber/40 p-4 text-sm"
              role="alert"
            >
              <p>
                Pickup information is unavailable. Retry before arranging a pickup or travelling.
              </p>
              <Button type="button" variant="outline"  @click="refresh"
                >Retry pickup information</Button
              >
            </div>
            <component
              :is="!searching && tab === 'active' ? TabsContent : 'section'"
              :value="!searching && tab === 'active' ? stage : undefined"
              :aria-labelledby="searching || tab === 'history' ? 'adoption-list-title' : undefined"
              class="space-y-4 pb-6"
              :aria-busy="loading"
            >
              <header
                :class="
                  filtered.length && (searching || tab === 'history')
                    ? 'adoption-list-intro'
                    : 'sr-only'
                "
              >
                <div :class="searching ? 'flex items-start justify-between gap-3' : 'sr-only'">
                  <h2 id="adoption-list-title" tabindex="-1" class="text-xl">{{ listTitle }}</h2>
                  <p class="text-sm text-muted-foreground">
                    {{ filtered.length }}
                    {{
                      hasUnlinked
                        ? filtered.length === 1
                          ? 'record'
                          : 'records'
                        : filtered.length === 1
                          ? 'book'
                          : 'books'
                    }}
                  </p>
                </div>
                <p v-if="listHint" :role="overdueCount ? 'status' : undefined">{{ listHint }}</p>
              </header>
              <p class="sr-only" role="status">
                {{ filtered.length }} {{ searching ? 'matching' : tab }} adoption records
              </p>
              <template v-if="filtered.length">
                <div class="adoption-list space-y-7">
                  <CustomerAdoptionTaskGroup
                    v-for="group in taskGroups"
                    :key="`${pageKey}-${group.key}`"
                    :title="group.title"
                    :description="group.description"
                  >
                    <div v-for="entry in group.entries" :key="entry.id" class="min-w-0">
                      <CustomerPickupCard
                        v-if="entry.kind === 'unlinked'"
                        :appointment="entry.appointment"
                        unlinked
                        @details="showAppointment(entry.appointment)"
                      />
                      <CustomerAdoptionCard
                        v-else
                        :record="entry.record"
                        :groupedOverdueWarning="overdueCount > 0"
                        @details="showDetails"
                        @pickup="showPickup"
                        :verified="pickupsReady && !loadError && !loading"
                      />
                    </div>
                  </CustomerAdoptionTaskGroup>
                </div>
                <AppPagination
                  v-if="filtered.length > pageSize"

                  v-model:page="page"
                  :total="filtered.length"
                  :pageSize="pageSize"
                  :visibleCount="paged.length"
                  :itemLabel="hasUnlinked ? 'records' : 'books'"
                />
              </template>
              <div
                v-else
                class="space-y-4 p-8 text-center"
                :class="{ 'rounded-xl border': !emptyPickups }"
              >
                <h3>{{ emptyCopy[0] }}</h3>
                <p class="text-sm text-muted-foreground">{{ emptyCopy[1] }}</p>
                <template v-if="!emptyPickups">
                  <Button
                    v-if="searching"
                    type="button"
                    variant="outline"

                    @click="search = ''"
                    >Clear search</Button
                  >
                  <Button
                    v-else-if="pickupError"
                    type="button"
                    variant="outline"

                    @click="refresh"
                    >Retry pickup information</Button
                  >
                  <Button
                    v-else-if="tab === 'active' && stage !== 'all' && emptyStageTarget"
                    type="button"
                    variant="outline"

                    @click="stage = emptyStageTarget"
                    >{{ emptyStageAction }}</Button
                  >
                  <Button v-else-if="tab === 'active'" asChild
                    ><RouterLink :to="{ name: 'customerBooks' }">Browse books</RouterLink></Button
                  >
                </template>
              </div>
            </component>
          </template>
        </component>
      </TabsContent>
    </Tabs>
    <CustomerAdoptionDialog
      ref="adoptionDialog"
      v-model:open="dialogOpen"
      :record="selectedRecord"
      :appointment="selectedAppointment"
      :initialMode="context.initialMode"
      :ready="pickupsReady && !loadError && !loading"
      :requestsReady="!loadError && !loading"
      :reconcile="reconcilePickup"
      :refresh="refresh"
      :complete="changed"
      :withdrawn="withdrawn"
      @restore-focus="restoreFocus"
      @history="viewHistory"
      @appointment="context.appointmentId = recordId($event)"
    />
  </AppPage>
</template>
