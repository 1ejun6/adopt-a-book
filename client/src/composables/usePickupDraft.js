import { nextTick, watch } from 'vue';
import { collectionLocation, validPickupDate } from '@/lib/adoptions';
import { appointmentTimes, availablePickupSlot, copyPickupDraft } from '@/lib/pickupTimes';
import { todayInSingapore } from '@/lib/date';
import { currentTime } from '@/lib/clock';

export function usePickupDraft(props, open, emit, state, resetNavigation) {
  const {
    step,
    saving,
    uncertain,
    operation,
    result,
    refreshWarning,
    confirming,
    confirmClose,
    initialDraft,
    error,
    errorNode,
    summaryNode,
    errors,
    draft,
    saved,
    today,
    pickupDateError,
    eligible,
    changed,
    errorEntries,
  } = state;
  function clearErrors() {
    error.value = '';
    Object.keys(errors).forEach((key) => {
      errors[key] = '';
    });
  }
  function fillDraft() {
    Object.assign(draft, {
      location: collectionLocation(props.record?.book),
      appointmentdate: props.appointment?.appointmentdate || '',
      timeslots: appointmentTimes(props.appointment),
    });
  }
  watch(
    open,
    (value) => {
      if (!value) {
        return;
      }
      resetNavigation();
      today.value = todayInSingapore();
      fillDraft();
      initialDraft.value = copyPickupDraft(draft);
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
  //@lee-hlmilk > date viability updates while the dialog is open and when the shared clock resumes after a hidden tab
  watch([() => draft.appointmentdate, currentTime], () => {
    if (!open.value || saving.value || !['details', 'review'].includes(step.value)) return;
    errors.appointmentdate = pickupDateError.value;
    if (pickupDateError.value && step.value === 'review') step.value = 'details';
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
    currentTime.value = Date.now();
    today.value = todayInSingapore();
    if (!draft.location.trim()) {
      errors.location = 'The book’s MRT station is unavailable. Refresh the book details before arranging pickup.';
    }
    if (!validPickupDate(draft.appointmentdate)) {
      errors.appointmentdate = 'Choose a valid pickup date.';
    } else if (pickupDateError.value) {
      errors.appointmentdate = pickupDateError.value;
    }
    if (
      draft.timeslots.length !== 2 || new Set(draft.timeslots).size !== 2 ||
      !draft.timeslots.every((timeslot) =>
        availablePickupSlot({ appointmentdate: draft.appointmentdate, timeslot }),
      )
    ) {
      errors.timeslot = 'Choose two different future times on your preferred date.';
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
  return { fillDraft, edit, changeField, focusField, review };
}
