<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import CustomerRequestDetailsDialog from './CustomerRequestDetailsDialog.vue';
import CustomerPickupDialog from './CustomerPickupDialog.vue';
import CustomerAdoptionProgress from './CustomerAdoptionProgress.vue';
import { bookAuthors, getApplicationStatus, pickupStatus, recordId } from '@/lib/adoptions';
import AppStatusDot from '@/components/shared/AppStatusDot.vue';
import { adoptionStatusTone, underReviewMessage } from '@/lib/myAdoptionsPresentation';
import AppIcon from '@/components/shared/AppIcon.vue';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const props = defineProps({
  myAdoptionsPresentation: { type: Boolean, default: false },
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
const emit = defineEmits(['restore-focus', 'appointment', 'history', 'back-book']);
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
const statusTone = computed(() => props.myAdoptionsPresentation
  ? adoptionStatusTone({ ...status.value, warning: props.record?.warning || unlinked.value })
  : status.value?.variant);
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
    return 'we couldn’t match this pickup to a book request. check with the team before you travel.';
  if (props.record?.warning) return props.record.description;
  if (props.myAdoptionsPresentation && view.value === 'adoption' && ['pending', 'pending review'].includes(props.record?.code))
    return underReviewMessage;
  if (view.value === 'pickup' && state.value.pickupStep === 'review')
    return 'check your pickup location, date and times before you send your request.';
  if (view.value === 'pickup' && state.value.pickupStep === 'details') {
    return getApplicationStatus(props.appointment) === 'appointment confirmed'
      ? 'update your pickup details. your current pickup stays confirmed until you send changes.'
      : 'choose a pickup date and two times at the book’s mrt station. wait for the team to confirm a time before you travel.';
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
async function backToBook() {
  if (await canNavigate()) emit('back-book');
}
defineExpose({ canNavigate });
</script>

<template>
  <Dialog :open="open" @update:open="updateOpen">
    <DialogContent
      class="adoption-dialog"
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
        <div v-if="status" class="space-y-3 border-b pb-5" aria-label="Adoption status">
          <CustomerAdoptionProgress
            v-if="state.flowVisible !== false"
            :applicationStatus="record?.application?.status || ''"
            :pickupStatus="getApplicationStatus(state.receipt || record?.appointment, '')"
            :verified="progressVerified"
            :editingPickup="editingPickup"
          />
          <div class="space-y-2">
            <p v-if="unlinked" class="text-sm text-muted-foreground">Unlinked pickup record</p>
            <p class="flex items-center gap-2 text-sm text-foreground"><AppStatusDot :tone="statusTone" />{{ status.label }}</p>
            <p v-if="record?.warning || unlinked" class="flex items-center gap-2 text-sm text-foreground"><AppStatusDot tone="amber" />{{
              record?.warning || 'Needs checking'
            }}</p>
            <p class="text-sm text-muted-foreground">{{ flowDescription }}</p>
          </div>
        </div>
        <div class="border-b pb-5">
          <AppBookIdentity
            :title="record?.book?.title || appointment?.booktitle || 'Book details unavailable'"
            :author="record?.book ? bookAuthors(record.book) : ''"
            :cover="record?.book?.thumbnailurl || record?.book?.coverurl"
            coverClass="w-14"
            wrap
          />
        </div>
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
          @pickup-record="showPickupRecord"
        />
        <Button v-if="embedded" type="button" variant="outline" :disabled="state.saving" @click="backToBook"><AppIcon name="back" />Back to book details</Button>
      </div>
    </DialogContent>
  </Dialog>
</template>
