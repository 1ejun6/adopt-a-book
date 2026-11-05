import { currentTime } from '@/lib/clock';
import { ref, reactive, computed, watch } from 'vue';
import {
  canManagePickup,
  getApplicationStatus,
  pickupComplete,
  recordId,
  pickupStatus,
  validPickupDate,
} from '@/lib/adoptions';
import { appointmentTimes, availablePickupTimes } from '@/lib/pickupTimes';
import { todayInSingapore } from '@/lib/date';

export function usePickupState(props) {
  const step = ref('view');
  const saving = ref(false);
  const uncertain = ref(false);
  const operation = ref(null);
  const result = ref('sent');
  const refreshWarning = ref('');
  const confirming = ref(false);
  const confirmClose = ref(false);
  const closeNode = ref(null);
  const initialDraft = ref({ location: '', appointmentdate: '', timeslots: ['', '', ''] });
  const error = ref('');
  const errorNode = ref(null);
  const summaryNode = ref(null);
  const errors = reactive({ location: '', appointmentdate: '', timeslot: '', form: '' });
  const draft = reactive({ location: '', appointmentdate: '', timeslots: ['', '', ''] });
  const saved = ref(null);
  const today = ref(todayInSingapore());
  watch(currentTime, value => { today.value = todayInSingapore(new Date(value)); });
  const pickupDateError = computed(() => {
    if (!validPickupDate(draft.appointmentdate)) return '';
    if (draft.appointmentdate < today.value) return 'Choose today or a later date in Singapore time.';
    return availablePickupTimes(draft.appointmentdate).length < 3
      ? "There aren't three available times left on this date. Choose another date." : '';
  });
  const manageable = computed(
    () => props.ready && canManagePickup(props.record, props.appointment),
  );
  const eligible = computed(() =>
    props.appointment ? manageable.value : props.ready && !!props.record?.canArrange,
  );
  const confirmed = computed(
    () => getApplicationStatus(props.appointment) === 'appointment confirmed',
  );
  const changed = computed(
    () =>
      !props.appointment ||
      draft.location.trim() !== (props.appointment.location || '').trim() ||
      draft.appointmentdate !== props.appointment.appointmentdate ||
      JSON.stringify(draft.timeslots) !== JSON.stringify(appointmentTimes(props.appointment)),
  );
  const draftChanged = computed(() => JSON.stringify(draft) !== JSON.stringify(initialDraft.value));
  const title = computed(() => {
    if (confirmClose.value) return 'Leave without sending?';
    if (step.value === 'success') {
      if (getApplicationStatus(saved.value) === 'appointment confirmed') return 'Pickup confirmed';
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
  return {
    step,
    saving,
    uncertain,
    operation,
    result,
    refreshWarning,
    confirming,
    confirmClose,
    closeNode,
    initialDraft,
    error,
    errorNode,
    summaryNode,
    errors,
    draft,
    saved,
    today,
    pickupDateError,
    manageable,
    eligible,
    confirmed,
    changed,
    draftChanged,
    title,
    status,
    errorEntries,
    receipt,
    submitLabel,
    editLabel,
  };
}
