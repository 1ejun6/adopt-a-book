<script setup>
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import AppPagination from '@/components/shared/AppPagination.vue';
import CustomerAdoptionTaskGroup from './CustomerAdoptionTaskGroup.vue';
import CustomerPickupCard from './CustomerPickupCard.vue';
import CustomerAdoptionCard from './CustomerAdoptionCard.vue';
import CustomerAdoptionEmpty from './CustomerAdoptionEmpty.vue';
defineProps({
  actionCounts: Object,
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
const action = defineModel('action', { type: String });
const page = defineModel('page', { type: Number });
const stage = defineModel('stage', { type: String });
const search = defineModel('search', { type: String });
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
      :is="!searching && tab === 'active' && stage === 'needs-action' ? Tabs : 'div'"
      v-model="action"
      class="space-y-4"
    >
      <TabsList
        v-if="!searching && tab === 'active' && stage === 'needs-action'"
        aria-label="Pickup actions"
        class="grid w-full grid-cols-2 gap-1 sm:flex sm:gap-3"
      >
        <TabsTrigger value="arrange" class="min-h-11 min-w-0 justify-center gap-1.5 px-1 text-xs sm:flex-none sm:px-3 sm:text-sm">
          Arrange a pickup
          <Badge v-if="!loading && !loadError && !pickupError" variant="neutral" class="tabular-nums">{{ actionCounts.arrange }}</Badge>
        </TabsTrigger>
        <TabsTrigger value="check" class="min-h-11 min-w-0 justify-center gap-1.5 px-1 text-xs sm:flex-none sm:px-3 sm:text-sm">
          Check your pickup
          <Badge v-if="!loading && !loadError && !pickupError" variant="neutral" class="tabular-nums">{{ actionCounts.check }}</Badge>
        </TabsTrigger>
      </TabsList>
      <component
        :is="!searching && tab === 'active' && stage === 'needs-action' ? TabsContent : 'div'"
        :value="action"
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
