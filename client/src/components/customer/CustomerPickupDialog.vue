<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import CustomerPickupDetails from './CustomerPickupDetails.vue';
import CustomerPickupReceipt from './CustomerPickupReceipt.vue';
import CustomerPickupReview from './CustomerPickupReview.vue';
import CustomerPickupForm from './CustomerPickupForm.vue';
import { usePickupMutations } from '@/composables/usePickupMutations';
import { usePickupNavigation } from '@/composables/usePickupNavigation';
import { usePickupDraft } from '@/composables/usePickupDraft';
import { usePickupState } from '@/composables/usePickupState';
import { computed, watchEffect } from 'vue';

import { pickupEvent } from '@/lib/calendar';
import { currentTime } from '@/lib/clock';

import { Button } from '@/components/ui/button';

const props = defineProps({
  record: { type: Object, default: null },
  appointment: { type: Object, default: null },
  initialMode: { type: String, default: 'view' },
  ready: { type: Boolean, default: false },
  reconcile: { type: Function, required: true },
  complete: { type: Function, required: true },
});
const open = defineModel('open', { type: Boolean, default: false });
const emit = defineEmits(['show-adoptions', 'back', 'state', 'focus-heading', 'pickup-record']);
const state = usePickupState(props);
const {
  step,
  saving,
  uncertain,
  operation,
  result,
  refreshWarning,
  confirming,
  confirmClose,
  closeNode,
  error,
  errorNode,
  summaryNode,
  errors,
  draft,
  saved,
  today,
  manageable,
  eligible,
  confirmed,
  title,
  status,
  errorEntries,
  receipt,
  submitLabel,
  editLabel,
} = state;
const navigation = usePickupNavigation(props, open, emit, state, {
  fillDraft: () => draftFlow.fillDraft(),
  changeField: (key) => draftFlow.changeField(key),
  focusField: (key) => draftFlow.focusField(key),
});
const { keepEditing, discardChanges, back, updateOpen, leaveReceipt, canNavigate } = navigation;
const draftFlow = usePickupDraft(props, open, emit, state, navigation.resetNavigation);
const { edit, changeField, focusField, review } = draftFlow;
const { checkStatus, submit, cancelPickup } = usePickupMutations(props, state, review);
const calendar = computed(() => {
  if (!props.ready || !props.record?.reliable || props.record.warning) {
    return null;
  }
  return pickupEvent(
    props.appointment,
    props.record.book?.title || props.appointment?.booktitle,
    currentTime.value,
  );
});
defineExpose({ canNavigate, updateOpen });
watchEffect(() =>
  emit('state', {
    title: title.value,
    saving: saving.value,
    pickupStep: step.value,
    flowVisible: !confirmClose.value && !confirming.value,
    receipt: step.value === 'success' ? saved.value : null,
  }),
);
</script>

<template>
  <div class="space-y-5">
    <p
      v-if="error"
      ref="errorNode"
      tabindex="-1"
      class="rounded-lg bg-badge-purple/40 p-3 text-sm text-destructive"
      role="alert"
    >
      {{ error }}
    </p>
    <Button
      v-if="uncertain && !confirmClose"
      type="button"
      variant="outline"
      :disabled="saving"
      @click="checkStatus"
       :loading="saving"><AppIcon name="refresh" /><span class="sr-only">Check status again</span></Button
    >
    <p v-if="refreshWarning" role="status" class="text-sm">{{ refreshWarning }}</p>
    <p v-if="!ready && !saving && step !== 'success'" class="text-sm" role="alert">
      Pickup status could not be checked. Close this dialog and retry pickup information before
      making changes.
    </p>
    <section v-if="confirmClose" class="space-y-4" aria-label="Unsaved pickup details">
      <p ref="closeNode" tabindex="-1" class="text-sm">
        Your pickup details haven’t been sent. Leaving now will discard your changes.
      </p>
      <p v-if="confirmed" class="text-sm text-muted-foreground">
        Your current confirmed pickup will stay unchanged.
      </p>
      <div class="adoption-actions">
        <Button type="button" @click="keepEditing"><AppIcon name="success" />Keep editing</Button>
        <Button type="button" variant="outline" @click="discardChanges"><AppIcon name="cancel" />Discard changes</Button>
      </div>
    </section>
    <CustomerPickupForm
      v-else-if="step === 'details'"
      v-model:draft="draft"
      :ready="ready"
      :eligible="eligible"
      :saving="saving"
      :uncertain="uncertain"
      :errorEntries="errorEntries"
      :errors="errors"
      :today="today"
      @review="review"
      @focus-field="focusField"
      @back="back"
      @summary-ref="summaryNode = $event"
    />
    <CustomerPickupReview
      v-else-if="step === 'review'"
      :draft="draft"
      :confirmed="confirmed"
      :appointment="appointment"
      :saving="saving"
      :uncertain="uncertain"
      :eligible="eligible"
      :submitLabel="submitLabel"
      @change-field="changeField"
      @back="back"
      @submit="submit"
    />
    <CustomerPickupReceipt
      v-else-if="step === 'success' && receipt"
      :result="result"
      :receipt="receipt"
      :operation="operation"
      :manageable="manageable"
      :saving="saving"
      @edit="step = 'details'"
      @leave="leaveReceipt"
    />
    <CustomerPickupDetails
      v-else-if="appointment"
      v-model:confirming="confirming"
      :appointment="appointment"
      :confirmed="confirmed"
      :record="record"
      :status="status"
      :saving="saving"
      :uncertain="uncertain"
      :manageable="manageable"
      :editLabel="editLabel"
      :calendar="calendar"
      @pickup-record="emit('pickup-record', $event)"
      @cancel="cancelPickup"
      @edit="edit"
      @back="back"
    />
  </div>
</template>
