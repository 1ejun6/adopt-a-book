import { ref, reactive, computed } from 'vue';
import {
  canManagePickup,
  getApplicationStatus,
  pickupComplete,
  recordId,
  pickupStatus,
} from '@/lib/adoptions';
import { todayInSingapore } from '@/lib/utils';

export function usePickupState(props) {
  const step = ref('view');
  const selectedSlot = ref('');
  const saving = ref(false);
  const uncertain = ref(false);
  const operation = ref(null);
  const result = ref('sent');
  const refreshWarning = ref('');
  const confirming = ref(false);
  const confirmClose = ref(false);
  const closeNode = ref(null);
  const initialDraft = ref({ location: '', appointmentdate: '', timeslot: '' });
  const error = ref('');
  const errorNode = ref(null);
  const summaryNode = ref(null);
  const errors = reactive({ location: '', appointmentdate: '', timeslot: '', form: '' });
  const draft = reactive({ location: '', appointmentdate: '', timeslot: '' });
  const saved = ref(null);
  const today = ref(todayInSingapore());
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
      ['location', 'appointmentdate', 'timeslot'].some(
        (key) => draft[key].trim() !== String(props.appointment[key] || '').trim(),
      ),
  );
  const draftChanged = computed(
    () =>
      selectedSlot.value !== '' ||
      ['location', 'appointmentdate', 'timeslot'].some(
        (key) => draft[key].trim() !== initialDraft.value[key].trim(),
      ),
  );
  const title = computed(() => {
    if (confirmClose.value) return 'Leave without sending?';
    if (step.value === 'success') {
      if (result.value === 'confirmed') return 'Pickup confirmed';
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
    selectedSlot,
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
