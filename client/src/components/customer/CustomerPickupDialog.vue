<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch, watchEffect } from 'vue';
import { api } from '@/lib/api';
import {
  canManagePickup,
  collectionLocation,
  displayDate,
  getApplicationStatus,
  pickupCalendar,
  downloadPickupCalendar,
  pickupComplete,
  validPickupDate,
  activePickup,
  bookId,
  pickupStatus,
  recordId,
} from '@/lib/adoptions';
import { todayInSingapore } from '@/lib/utils';
import CustomerAdoptionInformation from './CustomerAdoptionInformation.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
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
const step = ref('view');
const saving = ref(false);
const uncertain = ref(false);
const operation = ref(null);
const result = ref('sent');
const refreshWarning = ref('');
const confirming = ref(false);
const confirmClose = ref(false);
let closeAction = 'close';
let navigationDecision = null;
function resolveNavigation(allowed) {
  navigationDecision?.(allowed);
  navigationDecision = null;
}
onBeforeUnmount(() => resolveNavigation(false));
const closeNode = ref(null);
const initialDraft = ref({ location: '', appointmentdate: '', timeslot: '' });
const error = ref('');
const errorNode = ref(null);
const summaryNode = ref(null);
const errors = reactive({ location: '', appointmentdate: '', timeslot: '', form: '' });
const draft = reactive({ location: '', appointmentdate: '', timeslot: '' });
const saved = ref(null);
const today = ref(todayInSingapore());
const manageable = computed(() => props.ready && canManagePickup(props.record, props.appointment));
const eligible = computed(() =>
  props.appointment ? manageable.value : props.ready && !!props.record?.canArrange,
);
const confirmed = computed(
  () => getApplicationStatus(props.appointment) === 'appointment confirmed',
);
const changed = computed(
  () =>
    !props.appointment ||
    ['location', 'appointmentdate', 'timeslot'].some(
      (key) => draft[key].trim() !== String(props.appointment[key] || '').trim(),
    ),
);
const draftChanged = computed(() =>
  ['location', 'appointmentdate', 'timeslot'].some(
    (key) => draft[key].trim() !== initialDraft.value[key].trim(),
  ),
);
const title = computed(() => {
  if (confirmClose.value) return 'Leave without sending?';
  if (step.value === 'success') {
    return result.value === 'cancelled'
      ? 'Pickup cancelled'
      : result.value === 'current' || getApplicationStatus(saved.value) !== 'pending confirmation'
        ? 'Current pickup'
        : 'Pickup request sent';
  }
  if (step.value === 'review') {
    return 'Review pickup request';
  }
  if (step.value === 'details') {
    if (!props.appointment) {
      return 'Arrange pickup';
    }
    if (!pickupComplete(props.appointment)) {
      return 'Complete pickup details';
    }
    return confirmed.value ? 'Request a pickup change' : 'Edit pickup request';
  }
  return getApplicationStatus(props.appointment) === 'pending confirmation'
    ? 'Your pickup request'
    : 'Pickup details';
});
const status = computed(() => {
  if (props.appointment && !props.record) {
    return {
      label: 'Pickup needs checking',
      variant: 'neutral',
      description:
        'This pickup could not be linked to an adoption request. Check the details with the team before you travel.',
    };
  }
  if (
    props.record &&
    recordId(props.record.appointment) === recordId(props.appointment) &&
    props.record.warning
  ) {
    return {
      label: props.record.label,
      variant: props.record.variant,
      description: props.record.description,
    };
  }
  return pickupStatus(props.appointment);
});
const errorEntries = computed(() => Object.entries(errors).filter(([, message]) => message));
const receipt = computed(() => (step.value === 'success' ? saved.value : props.appointment));
const submitLabel = 'Send pickup request';
const editLabel = computed(() => {
  if (!pickupComplete(props.appointment)) {
    return 'Complete pickup details';
  }
  return confirmed.value ? 'Request a change' : 'Edit pickup request';
});
function clearErrors() {
  error.value = '';
  Object.keys(errors).forEach((key) => {
    errors[key] = '';
  });
}
function fillDraft() {
  Object.assign(draft, {
    location: props.appointment?.location || collectionLocation(props.record?.book),
    appointmentdate: props.appointment?.appointmentdate || '',
    timeslot: props.appointment?.timeslot || '',
  });
}
watch(
  open,
  (value) => {
    if (!value) {
      return;
    }
    closeAction = 'close';
    today.value = todayInSingapore();
    fillDraft();
    initialDraft.value = { ...draft };
    confirmClose.value = false;
    clearErrors();
    saved.value = null;
    result.value = 'sent';
    uncertain.value = false;
    operation.value = null;
    refreshWarning.value = '';
    confirming.value = false;
    step.value = ['create', 'edit'].includes(props.initialMode) ? 'details' : 'view';
    nextTick(() => emit('focus-heading'));
  },
  { immediate: true },
);
watch(error, async (value) => {
  if (value) {
    await nextTick();
    errorNode.value?.focus();
  }
});
watch(step, async (value) => {
  if (['review', 'success'].includes(value)) {
    await nextTick();
    emit('focus-heading');
  }
});
function edit() {
  clearErrors();
  confirming.value = false;
  step.value = 'details';
}
async function changeField(key) {
  step.value = 'details';
  await nextTick();
  focusField(key);
}
function focusField(key) {
  document.getElementById(`pickup-${key}`)?.focus();
}
// check required details before review > preserve the draft when an answer needs correcting
async function review() {
  if (saving.value || uncertain.value || !eligible.value) {
    return;
  }
  clearErrors();
  today.value = todayInSingapore();
  if (!draft.location.trim()) {
    errors.location = 'Enter a preferred pickup location.';
  }
  if (!validPickupDate(draft.appointmentdate)) {
    errors.appointmentdate = 'Choose a valid pickup date.';
  } else if (draft.appointmentdate < today.value) {
    errors.appointmentdate = 'Choose today or a later date in Singapore time.';
  }
  if (!draft.timeslot.trim()) {
    errors.timeslot = 'Enter a preferred time or time range.';
  }
  if (!changed.value) {
    errors.form = 'Change at least one pickup detail before sending an updated request.';
  }
  if (errorEntries.value.length) {
    await nextTick();
    summaryNode.value?.focus();
    return;
  }
  step.value = 'review';
}
// Acknowledged mutations stay successful even if the following list refresh fails.
async function finish(appointment, kind, reload = true) {
  saved.value = appointment;
  result.value = kind;
  if (kind !== 'current') initialDraft.value = { ...draft };
  uncertain.value = false;
  confirming.value = false;
  step.value = 'success';
  try {
    const ready = await props.complete(appointment, reload);
    refreshWarning.value = ready
      ? ''
      : 'Your change was saved, but we couldn’t refresh the list. Check updates before making another change.';
  } catch {
    refreshWarning.value =
      'Your change was saved, but we couldn’t refresh the list. Check updates before making another change.';
  }
}
async function checkStatus() {
  if (!operation.value) return;
  saving.value = true;
  error.value = '';
  try {
    const state = await props.reconcile();
    if (!state.ready) throw new Error('status unavailable');
    const pending = operation.value;
    const current = pending.id
      ? state.appointments.find((item) => recordId(item) === pending.id)
      : state.record?.pickups.find(
          (item) => bookId(item) === pending.bookId && !pending.before.includes(recordId(item)),
        );
    if (!state.record?.reliable) {
      error.value =
        'Pickup records need checking. Review the latest records before making another change.';
      return;
    }
    if (pending.kind === 'cancel' && current && getApplicationStatus(current) === 'cancelled') {
      await finish(current, 'cancelled', false);
      return;
    }
    if (pending.kind === 'save' && current) {
      const matches = ['location', 'appointmentdate', 'timeslot'].every(
        (key) => String(current[key] || '').trim() === pending.body[key],
      );
      if (
        (matches && getApplicationStatus(current) !== pending.originalStatus) ||
        (matches &&
          ['location', 'appointmentdate', 'timeslot'].some(
            (key) => pending.original[key] !== pending.body[key],
          )) ||
        (!pending.id && matches)
      ) {
        await finish(current, 'sent', false);
        return;
      }
    }
    if (
      pending.id &&
      current &&
      pending.kind === 'save' &&
      (getApplicationStatus(current) !== pending.originalStatus ||
        ['location', 'appointmentdate', 'timeslot'].some(
          (key) => current[key] !== pending.original[key],
        ))
    ) {
      await finish(current, 'current', false);
      return;
    }
    const alternative = state.record.pickups.find(activePickup);
    if (
      (pending.kind === 'save' && !pending.id && alternative) ||
      (current && !activePickup(current))
    ) {
      await finish(alternative || current, 'current', false);
      return;
    }
    const eligibleNow = pending.id
      ? canManagePickup(state.record, current)
      : state.record.canArrange;
    if (!eligibleNow) {
      error.value =
        'This adoption or pickup has changed. Check the latest details before continuing.';
      return;
    }
    uncertain.value = false;
    error.value = 'Your change wasn’t saved. Your details are still here, so you can try again.';
  } catch {
    error.value =
      'We couldn’t check whether your change was saved. Check the latest status before sending it again.';
  } finally {
    saving.value = false;
  }
}
async function submit() {
  if (
    saving.value ||
    uncertain.value ||
    !eligible.value ||
    !changed.value ||
    step.value !== 'review'
  )
    return;
  today.value = todayInSingapore();
  if (!validPickupDate(draft.appointmentdate) || draft.appointmentdate < today.value) {
    step.value = 'details';
    await review();
    return;
  }
  saving.value = true;
  error.value = '';
  const body = Object.fromEntries(
    ['location', 'appointmentdate', 'timeslot'].map((key) => [key, draft[key].trim()]),
  );
  const existingId = recordId(props.appointment);
  operation.value = {
    kind: 'save',
    id: existingId,
    body,
    bookId: props.record.bookId,
    before: props.record.pickups.map(recordId),
    original: { ...props.appointment },
    originalStatus: getApplicationStatus(props.appointment),
  };
  try {
    const response = await api(existingId ? `/appointments/${existingId}` : '/appointments', {
      method: existingId ? 'PATCH' : 'POST',
      body: existingId ? body : { ...body, bookid: props.record.bookId },
    });
    if (!recordId(response?.appointment)) throw new Error('receipt unavailable');
    await finish(response.appointment, 'sent');
  } catch {
    uncertain.value = true;
    await checkStatus();
  } finally {
    saving.value = false;
  }
}
async function cancelPickup() {
  if (saving.value || uncertain.value || !manageable.value) return;
  saving.value = true;
  error.value = '';
  operation.value = { kind: 'cancel', id: recordId(props.appointment) };
  try {
    await api(`/appointments/${recordId(props.appointment)}`, { method: 'DELETE' });
    await finish({ ...props.appointment, status: 'cancelled' }, 'cancelled');
  } catch {
    uncertain.value = true;
    await checkStatus();
  } finally {
    saving.value = false;
  }
}
const calendar = computed(() => {
  if (!props.ready || !props.record?.reliable || props.record.warning) {
    return '';
  }
  return pickupCalendar(
    props.appointment,
    props.record.book?.title || props.appointment?.booktitle,
  );
});
function saveCalendar() {
  if (calendar.value) {
    downloadPickupCalendar(
      props.appointment,
      props.record.book?.title || props.appointment?.booktitle,
    );
  }
}
async function keepEditing() {
  resolveNavigation(false);
  closeAction = 'close';
  confirmClose.value = false;
  if (draftChanged.value) step.value = 'details';
  await nextTick();
  if (draftChanged.value) {
    focusField('location');
  } else {
    emit('focus-heading');
  }
}
function discardChanges() {
  fillDraft();
  initialDraft.value = { ...draft };
  confirmClose.value = false;
  if (navigationDecision) {
    open.value = false;
    resolveNavigation(true);
  } else {
    closeDialog();
  }
}
function closeDialog() {
  if (closeAction === 'pickup-view') {
    step.value = 'view';
  } else if (closeAction === 'back') {
    emit('back');
  } else {
    open.value = false;
  }
  closeAction = 'close';
}
function back() {
  if (step.value === 'review') return changeField('location');
  closeAction = props.appointment && step.value === 'details' ? 'pickup-view' : 'back';
  updateOpen(false);
}
async function updateOpen(value) {
  if (saving.value) {
    return;
  }
  if (value) {
    open.value = true;
    return;
  }
  if (confirmClose.value) {
    await keepEditing();
    return;
  }
  if ((step.value !== 'success' || result.value === 'current') && draftChanged.value) {
    confirmClose.value = true;
    await nextTick();
    closeNode.value?.focus();
    return;
  }
  closeDialog();
}
function leaveReceipt() {
  if (result.value === 'current' && draftChanged.value) updateOpen(false);
  else emit('show-adoptions');
}
async function canNavigate() {
  if (!open.value) return true;
  if (saving.value) return false;
  if ((step.value !== 'success' || result.value === 'current') && draftChanged.value) {
    confirmClose.value = true;
    await nextTick();
    closeNode.value?.focus();
    resolveNavigation(false);
    return new Promise((resolve) => {
      navigationDecision = resolve;
    });
  }
  open.value = false;
  return true;
}
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
      class="rounded-lg bg-badge-rose/40 p-3 text-sm text-destructive"
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
      >Check status again</Button
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
        <Button type="button"  @click="keepEditing">Keep editing</Button>
        <Button type="button" variant="outline"  @click="discardChanges"
          >Discard changes</Button
        >
      </div>
    </section>
    <template v-else-if="step === 'details'">
      <p v-if="ready && !eligible" class="text-sm text-destructive" role="alert">
        This request can no longer be changed. Close and refresh to check its latest status.
      </p>
      <form class="space-y-4" novalidate :aria-busy="saving" @submit.prevent="review">
        <div
          v-if="errorEntries.length"
          ref="summaryNode"
          tabindex="-1"
          class="space-y-2 rounded-lg border-2 border-destructive p-3"
          role="alert"
        >
          <h3 class="text-xl">Check your pickup details</h3>
          <ul class="space-y-2 text-sm">
            <li v-for="[key, message] in errorEntries" :key="key">
              <button
                v-if="key !== 'form'"
                type="button"
                class="text-left underline underline-offset-4"
                @click="focusField(key)"
              >
                {{ message }}
              </button>
              <span v-else>{{ message }}</span>
            </li>
          </ul>
        </div>
        <Field>
          <FieldLabel for="pickup-location">Preferred pickup location</FieldLabel>
          <Input
            id="pickup-location"
            v-model="draft.location"
            required
            maxlength="300"
            :disabled="saving"
            :aria-invalid="!!errors.location || undefined"
            :aria-describedby="
              errors.location
                ? 'pickup-location-help pickup-location-error'
                : 'pickup-location-help'
            "
          />
          <p id="pickup-location-help" class="text-xs text-muted-foreground">
            The collection area is a suggested meeting point. You can suggest a different location.
          </p>
          <p v-if="errors.location" id="pickup-location-error" class="text-xs text-destructive">
            {{ errors.location }}
          </p>
        </Field>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel for="pickup-appointmentdate">Preferred date</FieldLabel>
            <Input
              id="pickup-appointmentdate"
              v-model="draft.appointmentdate"
              type="date"
              :min="today"
              required
              :disabled="saving"
              :aria-invalid="!!errors.appointmentdate || undefined"
              :aria-describedby="errors.appointmentdate ? 'pickup-date-error' : undefined"
            />
            <p
              v-if="errors.appointmentdate"
              id="pickup-date-error"
              class="text-xs text-destructive"
            >
              {{ errors.appointmentdate }}
            </p>
          </Field>
          <Field>
            <FieldLabel for="pickup-timeslot">Preferred time (SGT)</FieldLabel>
            <Input
              id="pickup-timeslot"
              v-model="draft.timeslot"
              placeholder="e.g. 10:30–11:00"
              required
              maxlength="100"
              :disabled="saving"
              :aria-invalid="!!errors.timeslot || undefined"
              :aria-describedby="errors.timeslot ? 'pickup-time-error' : undefined"
            />
            <p v-if="errors.timeslot" id="pickup-time-error" class="text-xs text-destructive">
              {{ errors.timeslot }}
            </p>
          </Field>
        </div>
        <p class="text-xs text-muted-foreground">All times are in Singapore time (SGT).</p>
        <div class="adoption-actions">
          <Button
            type="button"
            variant="outline"
            class="flex-1"
            :disabled="saving"
            @click="back"
            >Back</Button
          >
          <Button
            type="submit"
            class="flex-1"
            :disabled="saving || uncertain || !eligible"
          >
            Review pickup request
          </Button>
        </div>
      </form>
    </template>
    <template v-else-if="step === 'review'">
      <Badge variant="amber">Not submitted yet</Badge>
      <dl class="space-y-3 text-sm">
        <div
          v-for="field in [
            { key: 'location', label: 'Location', value: draft.location },
            { key: 'appointmentdate', label: 'Date', value: displayDate(draft.appointmentdate) },
            { key: 'timeslot', label: 'Time', value: draft.timeslot },
          ]"
          :key="field.key"
          class="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-start gap-3 border-b pb-3"
        >
          <dt class="text-muted-foreground">{{ field.label }}</dt>
          <dd class="[overflow-wrap:anywhere]">{{ field.value }}</dd>
          <dd>
            <button
              type="button"
              class="min-h-11 underline underline-offset-4"
              :aria-label="`Change ${field.label.toLowerCase()}`"
              :disabled="saving"
              @click="changeField(field.key)"
            >
              Change
            </button>
          </dd>
        </div>
      </dl>
      <p class="text-xs text-muted-foreground">Singapore time (SGT)</p>
      <section
        v-if="confirmed && appointment"
        class="space-y-1 rounded-lg border p-3 text-sm"
        aria-label="Current confirmed pickup"
      >
        <h3 class="text-xl">Current confirmed pickup</h3>
        <p>{{ displayDate(appointment.appointmentdate) }} · {{ appointment.timeslot }} SGT</p>
        <p class="[overflow-wrap:anywhere]">{{ appointment.location }}</p>
      </section>
      <p class="rounded-lg bg-badge-amber/50 p-3 text-sm">
        {{
          confirmed
            ? 'Sending these changes replaces your current confirmation. Wait until the updated pickup is confirmed before you travel.'
            : 'The team must confirm your requested time and location. Please wait for confirmation before you travel.'
        }}
      </p>
      <div class="adoption-actions">
        <Button type="button" variant="outline"  :disabled="saving" @click="back"
          >Edit details</Button
        >
        <Button
          type="button"

          :disabled="saving || uncertain || !eligible"
          @click="submit"
        >
          {{ saving ? 'Sending…' : submitLabel }}
        </Button>
      </div>
    </template>
    <template v-else-if="step === 'success' && receipt">
      <p v-if="result === 'cancelled' || result === 'current'" class="text-sm">
        {{
          result === 'cancelled'
            ? 'Your pickup has been cancelled. Your adoption is still approved.'
            : result === 'current'
              ? 'A pickup already exists for this book. Check its details below.'
              : pickupStatus(receipt).description
        }}
      </p>
      <dl
        v-if="result !== 'cancelled'"
        class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm"
      >
        <dt class="text-muted-foreground">Date</dt>
        <dd>{{ displayDate(receipt.appointmentdate) }}</dd>
        <dt class="text-muted-foreground">Time</dt>
        <dd class="[overflow-wrap:anywhere]">{{ receipt.timeslot }} SGT</dd>
        <dt class="text-muted-foreground">Location</dt>
        <dd class="[overflow-wrap:anywhere]">{{ receipt.location }}</dd>
      </dl>
      <p
        v-if="getApplicationStatus(receipt) === 'pending confirmation'"
        class="text-sm text-muted-foreground"
      >
        Track confirmation in Waiting in My Adoptions.
      </p>
      <details class="text-sm">
        <summary class="min-h-11 cursor-pointer py-3 underline underline-offset-4">
          Reference details
        </summary>
        <p class="select-all [overflow-wrap:anywhere]">Pickup reference: {{ recordId(receipt) }}</p>
      </details>
      <div class="adoption-actions">
        <Button
          v-if="result === 'current' && operation?.kind === 'save' && manageable"
          type="button"
          variant="outline"

          :disabled="saving"
          @click="step = 'details'"
          >Continue editing request</Button
        >
        <Button type="button"  :disabled="saving" @click="leaveReceipt">
          Back to my adoptions
        </Button>
      </div>
    </template>
    <template v-else-if="appointment">
      <h3 class="font-body text-sm font-semibold">
        {{
          getApplicationStatus(appointment) === 'collected'
            ? 'Pickup details'
            : confirmed
              ? 'Confirmed pickup'
              : getApplicationStatus(appointment) === 'pending confirmation'
                ? 'Requested pickup'
                : pickupStatus(appointment).label
        }}
      </h3>
      <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
        <dt class="text-muted-foreground">Date</dt>
        <dd>{{ displayDate(appointment.appointmentdate) }}</dd>
        <dt class="text-muted-foreground">Time</dt>
        <dd class="[overflow-wrap:anywhere]">
          {{ appointment.timeslot ? `${appointment.timeslot} SGT` : 'Time unavailable' }}
        </dd>
        <dt class="text-muted-foreground">Location</dt>
        <dd class="[overflow-wrap:anywhere]">{{ appointment.location || 'Unavailable' }}</dd>
      </dl>
      <p
        v-if="!confirming && (!record || record.warning || !confirmed)"
        class="text-sm text-muted-foreground"
      >
        {{ status.description }}
      </p>
      <CustomerAdoptionInformation
        v-if="!confirming"
        :record="record"
        :appointment="appointment"
        @pickup-record="emit('pickup-record', $event)"
      />
      <section
        v-if="confirming"
        class="space-y-3 rounded-lg bg-badge-rose/40 p-4"
        aria-label="Confirm pickup cancellation"
      >
        <h3 class="text-xl">Cancel this pickup?</h3>
        <p class="text-sm">
          Your adoption will remain approved. You can arrange another pickup if the book is still
          reserved for you.
        </p>
        <div class="adoption-actions">
          <Button
            type="button"
            variant="destructive"

            :disabled="saving || uncertain || !manageable"
            @click="cancelPickup"
          >
            {{ saving ? 'Cancelling…' : 'Cancel pickup' }}
          </Button>
          <Button
            type="button"
            variant="outline"

            :disabled="saving"
            @click="confirming = false"
          >
            Keep pickup
          </Button>
        </div>
      </section>
      <div v-else class="adoption-actions adoption-actions-wrap">
        <template v-if="manageable && !uncertain">
          <Button type="button" variant="destructive" :disabled="saving" @click="confirming = true">
            Cancel pickup
          </Button>
          <Button type="button" :disabled="saving" @click="edit">{{ editLabel }}</Button>
        </template>
        <Button v-else type="button" variant="outline" :disabled="saving" @click="back">
          Back
        </Button>
      </div>
      <div v-if="!confirming" class="flex flex-wrap gap-x-5 gap-y-2">
        <button
          v-if="calendar"
          type="button"
          class="min-h-11 text-sm underline underline-offset-4"
          @click="saveCalendar"
        >
          Add to calendar
        </button>
        <p v-if="(!manageable || uncertain) && record?.canArrange" class="text-sm text-muted-foreground">
          Your adoption stays approved. You can arrange another pickup in Active.
        </p>
      </div>
    </template>
  </div>
</template>
