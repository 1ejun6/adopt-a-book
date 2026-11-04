<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from 'reka-ui';
import { Alert02Icon } from '@hugeicons/core-free-icons';
import CustomerStatusTabs from '@/components/customer/CustomerStatusTabs.vue';
import CustomerAdoptionStageTabs from '@/components/customer/CustomerAdoptionStageTabs.vue';
import AppSearchInput from '@/components/shared/AppSearchInput.vue';
import AppPagination from '@/components/shared/AppPagination.vue';
import AdoptionSampleList from '@/components/sample/AdoptionSampleList.vue';
import AdoptionSampleDialog from '@/components/sample/AdoptionSampleDialog.vue';
import { createSampleAdoptions } from '@/components/sample/adoptionSampleData';
import { adoptionJourneys, adoptionSection, adoptionStage, bookAuthors } from '@/lib/adoptions';

const route = useRoute();
const router = useRouter();
const approaches = [
  { id: 'a', name: 'Quiet list', pitch: 'Less on the page', explanation: 'Simple tabs, one useful line, and a single compact list. The book stays the focus.' },
  { id: 'b', name: 'Clear choices', pitch: 'Know where to look', explanation: 'Each subtab explains what belongs there. Choose a category, then go straight to its books.' },
  { id: 'c', name: 'Grouped next steps', pitch: 'Know what to do', explanation: 'Books are grouped by their next step. Close a group when you’re done checking it.' },
];
const layout = ref(approaches.some(item => item.id === route.query.layout) ? route.query.layout : 'a');
const currentApproach = computed(() => approaches.find(item => item.id === layout.value));
const scenario = ref('checking');
const data = ref(createSampleAdoptions(scenario.value));
const section = ref('active');
const stage = ref('needs-action');
const search = ref('');
const page = ref(1);
const pageSize = 10;
const open = ref(false);
const selectedId = ref('');
const previousSearch = ref(null);
const records = computed(() => adoptionJourneys(data.value.applications, data.value.appointments));
const selectedRecord = computed(() => records.value.find(item => item.id === selectedId.value) || null);
const sectionCounts = computed(() => ({ active: records.value.filter(item => !item.history).length, history: records.value.filter(item => item.history).length }));
const counts = computed(() => Object.fromEntries(['needs-action', 'waiting', 'pickups', 'all'].map(value => [value, records.value.filter(item => !item.history && (value === 'all' || adoptionStage(item) === value)).length])));
const navigation = computed(() => [
  { value: 'needs-action', label: layout.value === 'b' ? 'Your next step' : 'To do', meaning: 'Arrange or check pickup' },
  { value: 'waiting', label: 'With the team', meaning: 'Book or pickup approval' },
  { value: 'pickups', label: 'Confirmed pickups', meaning: 'Your times and places' },
  { value: 'all', label: 'All active', meaning: 'Every ongoing adoption' },
]);
const resultRecords = computed(() => {
  const query = search.value.trim().toLowerCase();
  if (query) return records.value.filter(item => `${item.book.title} ${bookAuthors(item.book)} ${item.id}`.toLowerCase().includes(query));
  return records.value.filter(item => adoptionSection(item) === section.value && (section.value === 'history' || stage.value === 'all' || adoptionStage(item) === stage.value));
});
const paginated = computed(() => resultRecords.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const overdue = computed(() => resultRecords.value.filter(item => item.warning === 'Pickup date has passed').length);
const guide = computed(() => {
  if (search.value.trim()) return 'Matches across Active and History.';
  if (section.value === 'history') return 'Books you’ve collected and requests that have ended.';
  if (overdue.value) return 'Past pickup dates are marked below. Check with the team before travelling.';
  return ({ 'needs-action': 'Choose a book to arrange pickup or check its details.', waiting: 'The team is reviewing your book or pickup request. No action needed yet.', pickups: 'Your pickup is confirmed. Open a book to see details or request a change.', all: 'All your ongoing requests and pickups.' })[stage.value];
});
const grouped = computed(() => layout.value === 'c' || !!search.value.trim());
const groups = computed(() => {
  if (search.value.trim()) return ['active', 'history'].map(key => ({ key, title: key === 'active' ? 'Active' : 'History', rows: paginated.value.filter(item => adoptionSection(item) === key) })).filter(group => group.rows.length);
  if (layout.value !== 'c' || section.value === 'history') return [{ key: 'list', title: 'Your adoptions', rows: paginated.value }];
  const definitions = [
    { key: 'check', title: 'Check your pickup', hint: 'These dates have passed. Check with the team before travelling.', matches: item => !!item.warning },
    { key: 'arrange', title: 'Arrange a pickup', hint: 'Your book is approved. Choose a preferred time.', matches: item => !item.warning && item.canArrange },
    { key: 'confirmed', title: 'Your confirmed pickups', hint: 'Your time and meeting point are confirmed.', matches: item => !item.warning && item.code === 'pickup confirmed' },
    { key: 'confirmation', title: 'Waiting for pickup confirmation', hint: 'The team will confirm your preferred time. Please wait before travelling.', matches: item => !item.warning && item.code === 'pickup requested' },
    { key: 'review', title: 'Waiting for book approval', hint: 'You can arrange pickup once your request is approved.', matches: item => ['pending', 'pending review'].includes(item.code) },
  ];
  return definitions.map(group => ({ ...group, rows: paginated.value.filter(group.matches) })).filter(group => group.rows.length);
});
const emptyTitle = computed(() => search.value.trim() ? 'No books found' : section.value === 'history' ? 'No past adoptions yet' : ({ 'needs-action': 'Nothing needs your attention', waiting: 'No requests waiting for the team', pickups: 'No confirmed pickups', all: 'No active adoptions yet' })[stage.value]);
const emptyDescription = computed(() => search.value.trim() ? 'Try another title or author.' : section.value === 'history' ? 'Collected books and ended requests will appear here.' : ({ 'needs-action': 'Books appear here when you can arrange pickup or need to check details.', waiting: 'Book requests and pickups awaiting approval appear here.', pickups: 'Once a pickup is confirmed, its time and location appear here.', all: 'Your book requests will appear here.' })[stage.value]);

watch(layout, value => { router.replace({ query: { ...route.query, layout: value } }); });
watch(() => route.query.layout, value => { if (approaches.some(item => item.id === value)) layout.value = value; });
watch([section, stage], () => { page.value = 1; });
watch(search, (value, old) => {
  if (value.trim() && !old.trim()) previousSearch.value = { section: section.value, stage: stage.value, page: page.value, scroll: window.scrollY };
  page.value = 1;
  if (!value.trim() && previousSearch.value) {
    const previous = previousSearch.value;
    section.value = previous.section; stage.value = previous.stage;
    nextTick(() => { page.value = previous.page; window.scrollTo(0, previous.scroll); });
    previousSearch.value = null;
  }
});
watch(scenario, reset);
function reset() { data.value = createSampleAdoptions(scenario.value); section.value = 'active'; stage.value = 'needs-action'; search.value = ''; page.value = 1; previousSearch.value = null; }
function openRecord(record) { selectedId.value = record.id; open.value = true; }
function savePickup(draft) {
  const record = selectedRecord.value;
  const existing = record.appointment;
  const value = { id: existing?.id || `sample-pickup-${record.id}`, bookid: record.bookId, userid: 'sample-reader', createdat: existing?.createdat || new Date().toISOString(), status: 'pending confirmation', appointmentdate: draft.date, timeslot: draft.time, location: draft.location };
  if (existing) Object.assign(data.value.appointments.find(item => item.id === existing.id), value);
  else data.value.appointments.push(value);
}
function cancelPickup() { const pickup = data.value.appointments.find(item => item.id === selectedRecord.value.appointment.id); pickup.status = 'cancelled'; }
function withdraw() { data.value.applications.find(item => item.id === selectedId.value).status = 'cancelled'; }
async function restoreFocus() {
  const record = selectedRecord.value;
  if (record && !search.value.trim()) {
    section.value = adoptionSection(record);
    if (section.value === 'active' && stage.value !== 'all') stage.value = adoptionStage(record);
    await nextTick();
    page.value = Math.floor(resultRecords.value.findIndex(item => item.id === selectedId.value) / pageSize) + 1;
  }
  await nextTick();
  const row = document.getElementById(`adoption-${selectedId.value}`);
  if (row) { row.closest('details')?.setAttribute('open', ''); row.focus({ preventScroll: true }); row.scrollIntoView({ block: 'nearest' }); }
}
</script>

<template>
  <div class="sample-page">
    <aside class="sample-workbench" aria-label="Compare design approaches">
      <div class="sample-workbench-top"><span class="sample-eyebrow">MY ADOPTIONS · DESIGN OPTIONS</span><span>Sample data only. Your account stays untouched.</span></div>
      <div class="sample-approaches" role="group" aria-label="Choose an approach">
        <button v-for="approach in approaches" :key="approach.id" :aria-pressed="layout === approach.id" :class="{ selected: layout === approach.id }" @click="layout = approach.id"><span class="sample-letter">{{ approach.id.toUpperCase() }}</span><span><strong>{{ approach.name }}</strong><small>{{ approach.pitch }}</small></span></button>
      </div>
      <div class="sample-workbench-bottom"><p>{{ currentApproach.explanation }}</p><div class="sample-scenarios"><label for="sample-scenario">Try with</label><select id="sample-scenario" v-model="scenario"><option value="checking">Your screenshot’s stages</option><option value="upcoming">Confirmed pickups too</option><option value="empty">An empty account</option></select><button class="sample-reset" @click="reset">Reset demo</button></div></div>
    </aside>

    <section class="sample-product" :class="`sample-product--${layout}`" aria-labelledby="sample-page-title">
      <h1 id="sample-page-title">My Adoptions</h1>
      <TabsRoot v-model="section" class="sample-primary-tabs">
        <div class="sample-top-row"><CustomerStatusTabs :counts="sectionCounts" /><AppSearchInput v-model="search" placeholder="Find a book" aria-label="Find a book across Active and History" class="sample-search" /></div>
        <TabsContent :key="section" :value="section" class="sample-section-content">
          <TabsRoot v-model="stage">
            <div v-if="section === 'active'" class="sample-stage-navigation">
              <CustomerAdoptionStageTabs v-if="layout === 'a'" :counts="counts" />
              <TabsList v-else aria-label="Active adoption stages" :class="layout === 'b' ? 'sample-choice-tabs' : 'sample-task-tabs'">
                <TabsTrigger v-for="item in navigation" :key="item.value" :value="item.value" :class="layout === 'b' ? 'sample-choice washi-tape-hover' : 'sample-task-tab'">
                  <span class="sample-choice-heading"><span>{{ item.label }}</span><span class="sample-tab-count">{{ counts[item.value] }}</span></span>
                  <span v-if="layout === 'b'" class="sample-choice-meaning">{{ item.meaning }}</span>
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent :key="stage" :value="stage" class="sample-results">
              <template v-if="resultRecords.length">
                <div v-if="layout === 'a' || search.trim() || section === 'history'" class="sample-quiet-guide" role="status">{{ guide }}</div>
                <p v-else-if="layout === 'b' && overdue" class="sample-pickup-notice"><HugeiconsIcon :icon="Alert02Icon" class="size-4 shrink-0" aria-hidden="true" /><span>{{ overdue }} past pickup dates. Open a marked book to check with the team before travelling.</span></p>
                <AdoptionSampleList :groups="groups" :grouped="grouped && (!!search.trim() || section !== 'history')" :connected="layout === 'a'" :collapsible="layout === 'c' && !search.trim() && section !== 'history'" @open="openRecord" />
                <AppPagination v-model:page="page" :total="resultRecords.length" :pageSize="pageSize" :visibleCount="paginated.length" itemLabel="books" class="sample-pagination" />
              </template>
              <div v-else class="sample-empty" role="status"><h2>{{ emptyTitle }}</h2><p>{{ emptyDescription }}</p></div>
            </TabsContent>
          </TabsRoot>
        </TabsContent>
      </TabsRoot>
    </section>
    <AdoptionSampleDialog v-model:open="open" :record="selectedRecord" @pickup="savePickup" @cancel="cancelPickup" @withdraw="withdraw" @closed="restoreFocus" />
  </div>
</template>

<style scoped>
.sample-page { width: 100%; min-width: 0; }
.sample-workbench { max-width: 1140px; margin: 0 auto; padding: 20px; font: 12px/1.5 system-ui, sans-serif; }
.sample-workbench-top { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px 20px; color: var(--muted-foreground); margin-bottom: 14px; }
.sample-approaches { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.sample-approaches button { display: flex; align-items: center; gap: 12px; min-height: 68px; padding: 10px 14px; border: 1px solid var(--border); border-radius: 9px; text-align: left; cursor: pointer; }
.sample-approaches button:hover { background: var(--primary); }
.sample-approaches button.selected { background: var(--primary); border-color: var(--foreground); }
.sample-approaches strong { display: block; font-weight: 600; font-size: 13px; }
.sample-approaches small { display: block; color: var(--muted-foreground); margin-top: 2px; font-size: 11px; }
.sample-workbench-bottom { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 16px; }
.sample-workbench-bottom > p { max-width: 510px; color: var(--muted-foreground); }
.sample-scenarios { display: flex; align-items: center; flex-shrink: 0; gap: 10px; }
.sample-scenarios select { max-width: 190px; min-height: 36px; border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; background: var(--background); }
.sample-reset { min-height: 36px; text-decoration: underline; text-underline-offset: 3px; }
.sample-product { max-width: 1024px; margin: 38px auto 48px; }
.sample-product h1 { font-size: 40px; line-height: 1.2; text-align: center; margin-bottom: 32px; }
.sample-top-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; }
.sample-search { width: 256px; }
.sample-stage-navigation { margin-bottom: 20px; }
.sample-quiet-guide { margin: -3px 0 18px; color: var(--muted-foreground); font-size: 13px; line-height: 1.65; }
.sample-choice-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.sample-choice { display: grid; align-content: center; gap: 5px; min-width: 0; min-height: 82px; border: 1px solid var(--border); border-radius: 10px; padding: 13px 16px; text-align: left; }
.sample-choice[data-state='active'] { border-color: var(--foreground); }
.sample-choice-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; font-size: 15px; }
.sample-choice-meaning { font-size: 11px; color: var(--muted-foreground); line-height: 1.6; }
.sample-tab-count { font-size: 12px; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
.sample-task-tabs { display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid var(--border); }
.sample-task-tab { min-height: 44px; padding: 8px 15px; border-bottom: 2px solid transparent; }
.sample-task-tab[data-state='active'] { border-bottom-color: var(--foreground); font-weight: 600; }
.sample-task-tab .sample-choice-heading { gap: 10px; font-size: 14px; }
.sample-pickup-notice { display: flex; align-items: baseline; gap: 10px; margin-bottom: 18px; font-size: 13px; line-height: 1.7; color: var(--muted-foreground); }
.sample-pagination { margin-top: 20px; padding-inline: 0; }
.sample-empty { padding: 38px 12px 60px; text-align: center; }
.sample-empty h2 { font-size: 23px; }
.sample-empty p { color: var(--muted-foreground); font-size: 14px; line-height: 1.8; margin: 14px auto 0; max-width: 420px; }
@media (max-width: 900px) { .sample-workbench-bottom { flex-direction: column; align-items: flex-start; gap: 12px; } .sample-workbench-bottom > p { max-width: none; } }
@media (max-width: 639px) {
  .sample-approaches { gap: 6px; }
  .sample-approaches button { min-height: 90px; align-items: flex-start; flex-direction: column; gap: 6px; padding: 9px; }
  .sample-approaches strong { font-size: 11px; line-height: 1.4; }
  .sample-approaches small { display: none; }
  .sample-scenarios { flex-wrap: wrap; width: 100%; gap: 8px; font-size: 11px; }
  .sample-scenarios select { flex: 1; min-width: 0; }
  .sample-scenarios label { display: none; }
  .sample-top-row { flex-direction: column; align-items: stretch; gap: 18px; margin-bottom: 18px; }
  .sample-search { width: 100%; }
  .sample-choice-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .sample-choice { min-height: 78px; padding: 11px; }
  .sample-task-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; }
  .sample-task-tab { padding-inline: 9px; }
  .sample-task-tab .sample-choice-heading { font-size: 13px; }
}
</style>
