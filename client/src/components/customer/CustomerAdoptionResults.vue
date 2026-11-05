<script setup>
import { computed } from 'vue';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import AppPagination from '@/components/shared/AppPagination.vue';
import CustomerAdoptionTaskGroup from './CustomerAdoptionTaskGroup.vue';
import CustomerPickupCard from './CustomerPickupCard.vue';
import CustomerAdoptionCard from './CustomerAdoptionCard.vue';
import CustomerAdoptionEmpty from './CustomerAdoptionEmpty.vue';
defineProps({
  actionCounts: Object,
  waitingCounts: Object,
  searching: Boolean,
  tab: String,
  loading: Boolean,
  filtered: Array,
  hasUnlinked: Boolean,
  listTitle: String,
  listHint: String,
  overdueCount: Number,
  taskGroups: Array,
  pageKey: String,
  pageSize: Number,
  paged: Array,
  pickupsReady: Boolean,
  loadError: String,
  pickupError: String,
  emptyCopy: Array,
  emptyPickups: Boolean,
  emptyStageTarget: String,
  emptyStageAction: String,
});
const waiting = defineModel('waiting', { type: String });
const action = defineModel('action', { type: String });
const page = defineModel('page', { type: Number });
const stage = defineModel('stage', { type: String });
const search = defineModel('search', { type: String });
const subtask = computed({ get: () => stage.value === 'waiting' ? waiting.value : action.value, set: value => { if (stage.value === 'waiting') waiting.value = value; else action.value = value; } });
const emit = defineEmits(['appointment', 'details', 'pickup', 'refresh']);
</script>
<template>
  <component
    :is="!searching && tab === 'active' ? TabsContent : 'section'"
    :value="!searching && tab === 'active' ? stage : undefined"
    :aria-labelledby="searching || tab === 'history' ? 'adoption-list-title' : undefined"
    class="space-y-4 pb-6"
    :aria-busy="loading"
  >
    <component
      :is="!searching && tab === 'active' && ['needs-action', 'waiting'].includes(stage) ? Tabs : 'div'"
      v-model="subtask"
      class="space-y-4"
    >

      <TabsList v-if="!searching && tab === 'active' && stage === 'waiting'" aria-label="Waiting tasks" class="adoption-tabs">
        <TabsTrigger value="approval">Adoption approval <Badge v-if="!loading && !loadError && !pickupError" variant="neutral">{{ waitingCounts.approval }}</Badge></TabsTrigger>
        <TabsTrigger value="confirmation">Pickup confirmation <Badge v-if="!loading && !loadError && !pickupError" variant="neutral">{{ waitingCounts.confirmation }}</Badge></TabsTrigger>
      </TabsList>

      <TabsList
        v-if="!searching && tab === 'active' && stage === 'needs-action'"
        aria-label="Pickup actions"
        class="adoption-tabs"
      >
        <TabsTrigger value="arrange" >
          Arrange pickup
          <Badge v-if="!loading && !loadError && !pickupError" variant="neutral" class="adoption-tab-count tabular-nums">{{ actionCounts.arrange }}</Badge>
        </TabsTrigger>
        <TabsTrigger value="check" >
          Review issues
          <Badge v-if="!loading && !loadError && !pickupError" variant="neutral" class="adoption-tab-count tabular-nums">{{ actionCounts.check }}</Badge>
        </TabsTrigger>
      </TabsList>
      <component
        :is="!searching && tab === 'active' && ['needs-action', 'waiting'].includes(stage) ? TabsContent : 'div'"
        :value="subtask"
        class="space-y-4"
      >
        <header
          :class="
            filtered.length && (searching || tab === 'history') ? 'adoption-list-intro' : 'sr-only'
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
                  @details="emit('appointment', entry.appointment)"
                />
                <CustomerAdoptionCard
                  v-else
                  :record="entry.record"
                  :groupedOverdueWarning="overdueCount > 0"
                  @details="emit('details', $event)"
                  @pickup="emit('pickup', $event)"
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
        <CustomerAdoptionEmpty
          v-else
          v-model:stage="stage"
          v-model:search="search"
          :emptyCopy="emptyCopy"
          :emptyPickups="emptyPickups"
          :emptyStageTarget="emptyStageTarget"
          :emptyStageAction="emptyStageAction"
          :searching="searching"
          :pickupError="pickupError"
          :tab="tab"
          @refresh="emit('refresh')"
        />
      </component>
    </component>
  </component>
</template>
