<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import CustomerRequestDetailsDialog from './CustomerRequestDetailsDialog.vue';
import CustomerPickupDialog from './CustomerPickupDialog.vue';
import CustomerAdoptionProgress from './CustomerAdoptionProgress.vue';
import { bookAuthors, getApplicationStatus, pickupStatus, recordId } from '@/lib/adoptions';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const props = defineProps({
  embedded: { type: Boolean, default: false },
  record: { type: Object, default: null },
  appointment: { type: Object, default: null },
  initialMode: { type: String, default: 'adoption' },
  ready: { type: Boolean, default: false },
  requestsReady: { type: Boolean, default: false },
  reconcile: { type: Function, required: true },
  refresh: { type: Function, required: true },
  complete: { type: Function, required: true },
  withdrawn: { type: Function, required: true },
});
const open = defineModel('open', { type: Boolean, default: false });
const emit = defineEmits(['restore-focus', 'appointment', 'history']);
const view = ref('adoption');
const pickupMode = ref('view');
const pickupKey = ref(0);
const detailsBody = ref(null);
const pickupBody = ref(null);
const headingNode = ref(null);
const state = ref({ title: 'Adoption details', saving: false, receipt: null });
const title = computed(() => state.value.title);
const body = computed(() => (view.value === 'adoption' ? detailsBody.value : pickupBody.value));
const status = computed(() => {
  if (state.value.receipt) return pickupStatus(state.value.receipt);
  if (
    view.value === 'pickup' &&
    props.appointment &&
    recordId(props.appointment) !== recordId(props.record?.appointment)
  ) {
    return pickupStatus(props.appointment);
  }
  return props.record || (props.appointment ? pickupStatus(props.appointment) : null);
});
const unlinked = computed(() => !props.record && !!props.appointment);
const editingPickup = computed(
  () => view.value === 'pickup' && ['details', 'review'].includes(state.value.pickupStep),
);
const progressVerified = computed(() => {
  if (!props.requestsReady || !props.record?.reliable) return false;
  if (['pending', 'pending review'].includes(getApplicationStatus(props.record.application)))
    return true;
  return props.ready && props.record.pickupsVerified;
});
const flowDescription = computed(() => {
  if (unlinked.value)
    return 'This pickup could not be linked to an adoption request. Check the details with the team before travelling.';
  if (props.record?.warning) return props.record.description;
  if (view.value === 'pickup' && state.value.pickupStep === 'review')
    return 'Check your preferred location, date and time before sending your pickup request.';
  if (view.value === 'pickup' && state.value.pickupStep === 'details') {
    return getApplicationStatus(props.appointment) === 'appointment confirmed'
      ? 'Update your preferred pickup details. Your current pickup stays confirmed until you send changes.'
      : 'Choose a date and two available times for pickup at the book’s MRT station. The team will confirm one before you travel.';
  }
  return status.value?.description || '';
});
async function focusHeading() {
  await nextTick();
  headingNode.value?.focus();
  headingNode.value?.closest('[role="dialog"]')?.scrollTo({ top: 0 });
}
watch(open, (value) => {
  if (value) {
    view.value = props.initialMode === 'adoption' ? 'adoption' : 'pickup';
    pickupMode.value = props.initialMode;
    state.value = {
      title: view.value === 'adoption' ? 'Adoption details' : 'Pickup details',
      saving: false,
      receipt: null,
    };
  }
});
watch(title, focusHeading);
function updateOpen(value) {
  body.value?.updateOpen(value);
}
function managePickup(record) {
  emit('appointment', record.canArrange ? null : record.appointment);
  pickupMode.value = record.canArrange ? 'create' : 'view';
  view.value = 'pickup';
  focusHeading();
}
function showPickupRecord(appointment) {
  emit('appointment', appointment);
  pickupMode.value = 'view';
  // Initialize the selected attempt without replacing the dialog shell.
  pickupKey.value++;
  view.value = 'pickup';
}
function backToAdoption() {
  if (!props.record) {
    open.value = false;
    return;
  }
  state.value = { title: 'Adoption details', saving: false, receipt: null };
  view.value = 'adoption';
  focusHeading();
}
async function canNavigate() {
  if (!open.value) return true;
  return (await body.value?.canNavigate()) !== false;
}
defineExpose({ canNavigate });
</script>

<template>
  <Dialog :open="open" @update:open="updateOpen">
    <DialogContent
      class="adoption-dialog max-w-[720px]"
      :showCloseButton="!state.saving"
      @closeAutoFocus="emit('restore-focus', $event)"
      @escapeKeyDown="
        (event) => {
          if (state.saving) event.preventDefault();
        }
      "
      @interactOutside="
        (event) => {
          if (state.saving) event.preventDefault();
        }
      "
    >
      <DialogHeader>
        <DialogTitle
          ><span ref="headingNode" tabindex="-1">{{ title }}</span></DialogTitle
        >
        <DialogDescription class="sr-only">{{
          record?.book?.title || appointment?.booktitle || 'Adoption information'
        }}</DialogDescription>
      </DialogHeader>
      <div class="dialog-body space-y-5">
        <div v-if="status" class="space-y-3" aria-label="Adoption status">
          <CustomerAdoptionProgress
            v-if="state.flowVisible !== false"
            :applicationStatus="record?.application?.status || ''"
            :pickupStatus="getApplicationStatus(state.receipt || record?.appointment, '')"
            :verified="progressVerified"
            :editingPickup="editingPickup"
          />
          <div class="space-y-2">
            <p v-if="unlinked" class="text-sm text-muted-foreground">Unlinked pickup record</p>
            <Badge :variant="status.variant">{{ status.label }}</Badge>
            <Badge v-if="record?.warning || unlinked" variant="amber" class="ml-2">{{
              record?.warning || 'Needs checking'
            }}</Badge>
            <p class="text-sm text-muted-foreground">{{ flowDescription }}</p>
          </div>
        </div>
        <AppBookIdentity
          :title="record?.book?.title || appointment?.booktitle || 'Book details unavailable'"
          :author="record?.book ? bookAuthors(record.book) : ''"
          :cover="record?.book?.thumbnailurl || record?.book?.coverurl"
          coverClass="w-14"
          wrap
        />
        <CustomerRequestDetailsDialog
          v-if="open && view === 'adoption' && record"
          ref="detailsBody"
          v-model:open="open"
          :record="record"
          :embedded="embedded"
          :ready="requestsReady"
          :reconcile="refresh"
          :complete="withdrawn"
          @state="state = { ...$event, receipt: null }"
          @focus-heading="focusHeading"
          @pickup="managePickup"
          @pickup-record="showPickupRecord"
          @history="emit('history')"
        />
        <CustomerPickupDialog
          v-if="open && view === 'pickup'"
          ref="pickupBody"
          :key="pickupKey"
          v-model:open="open"
          :record="record"
          :appointment="appointment"
          :initialMode="pickupMode"
          :ready="ready"
          :reconcile="reconcile"
          :complete="complete"
          @state="state = $event"
          @focus-heading="focusHeading"
          @back="backToAdoption"
          @show-adoptions="open = false"
          @pickup-record="showPickupRecord"
        />
      </div>
    </DialogContent>
  </Dialog>
</template>
