<script setup>
import CustomerAdoptionResults from '@/components/customer/CustomerAdoptionResults.vue';
import CustomerAdoptionLoadState from '@/components/customer/CustomerAdoptionLoadState.vue';
import CustomerAdoptionToolbar from '@/components/customer/CustomerAdoptionToolbar.vue';
import { computed, onMounted } from 'vue';

import AppPage from '@/components/shared/AppPage.vue';

import CustomerStatusTabs from '@/components/customer/CustomerStatusTabs.vue';

import CustomerAdoptionDialog from '@/components/customer/CustomerAdoptionDialog.vue';

import { storeToRefs } from 'pinia';
import { useAdoptionsStore } from '@/stores/adoptions';
import { recordId } from '@/lib/adoptions';

import { Tabs, TabsContent } from '@/components/ui/tabs';

import { useAdoptionGroups } from '@/composables/useAdoptionGroups';
import { useAdoptionNavigation } from '@/composables/useAdoptionNavigation';
import { useAdoptionResults } from '@/composables/useAdoptionResults';
import { useAdoptionReveal } from '@/composables/useAdoptionReveal';
import { useAdoptionDialogState } from '@/composables/useAdoptionDialogState';
import { useAdoptionLinks } from '@/composables/useAdoptionLinks';
const adoptions = useAdoptionsStore();
const {
  appointments,
  applicationsLoading,
  appointmentsLoading,
  applicationsError: loadError,
  appointmentsError: pickupError,
  pickupsReady,
  applicationsLoaded: loaded,
  journeys: records,
} = storeToRefs(adoptions);
const loading = computed(() => applicationsLoading.value || appointmentsLoading.value);
const refresh = () => adoptions.refresh();
const grouping = useAdoptionGroups({ records, appointments });
const { counts, stageCounts, actionCounts } = grouping;
const navigation = useAdoptionNavigation(grouping);
const {
  stage,
  action,
  tab,
  search,
  searching,
  page,
  pageKey,
  pageSize,
  selectTab,
  internalNavigation,
} = navigation;
const results = useAdoptionResults({ grouping, navigation, loading, loadError, pickupError });
const {
  filtered,
  paged,
  overdueCount,
  taskGroups,
  listHint,
  maxPage,
  hasUnlinked,
  listTitle,
  emptyStageTarget,
  emptyStageAction,
  emptyPickups,
  emptyCopy,
} = results;
const { revealRecord } = useAdoptionReveal({ grouping, navigation, results });
const dialog = useAdoptionDialogState({
  records,
  appointments,
  loading,
  loadError,
  pickupsReady,
  refresh,
  revealRecord,
  selectTab,
  internalNavigation,
});
const {
  titleNode,
  adoptionDialog,
  dialogOpen,
  context,
  routeNotice,
  updateAnnouncement,
  selectedRecord,
  selectedAppointment,
  showDetails,
  showAppointment,
  showPickup,
  withdrawn,
  viewHistory,
  reconcilePickup,
  changed,
  restoreFocus,
} = dialog;
useAdoptionLinks({
  grouping,
  navigation,
  dialog,
  loading,
  loadError,
  pickupsReady,
  appointments,
  records,
  maxPage,
  revealRecord,
});
onMounted(refresh);
</script>

<template>
  <AppPage class="adoptions-page space-y-5" aria-labelledby="adoptions-title">
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
          <CustomerAdoptionToolbar
            v-model:search="search"
            :tab="tab"
            :searching="searching"
            :stageCounts="stageCounts"
            :loading="loading"
            :loaded="loaded"
            :loadError="loadError"
            :pickupError="pickupError"
          />
          <CustomerAdoptionLoadState
            :loading="loading"
            :loaded="loaded"
            :loadError="loadError"
            :pickupError="pickupError"
            @refresh="refresh"
          >
            <CustomerAdoptionResults
              v-model:action="action"
              :actionCounts="actionCounts"
              v-model:page="page"
              v-model:stage="stage"
              v-model:search="search"
              :searching="searching"
              :tab="tab"
              :loading="loading"
              :filtered="filtered"
              :hasUnlinked="hasUnlinked"
              :listTitle="listTitle"
              :listHint="listHint"
              :overdueCount="overdueCount"
              :taskGroups="taskGroups"
              :pageKey="pageKey"
              :pageSize="pageSize"
              :paged="paged"
              :pickupsReady="pickupsReady"
              :loadError="loadError"
              :pickupError="pickupError"
              :emptyCopy="emptyCopy"
              :emptyPickups="emptyPickups"
              :emptyStageTarget="emptyStageTarget"
              :emptyStageAction="emptyStageAction"
              @appointment="showAppointment"
              @details="showDetails"
              @pickup="showPickup"
              @refresh="refresh"
            />
          </CustomerAdoptionLoadState>
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
