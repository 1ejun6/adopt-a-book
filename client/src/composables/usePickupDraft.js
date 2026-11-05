import { nextTick, watch } from 'vue';
import { collectionLocation, validPickupDate } from '@/lib/adoptions';
import { appointmentTimes, availablePickupSlot, copyPickupDraft } from '@/lib/pickupTimes';
import { todayInSingapore } from '@/lib/utils';

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
      location: props.appointment?.location || collectionLocation(props.record?.book),
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
    if (
      new Set(draft.timeslots).size !== 3 ||
      !draft.timeslots.every((timeslot) =>
        availablePickupSlot({ appointmentdate: draft.appointmentdate, timeslot }),
      )
    ) {
      errors.timeslot = 'Choose three different future times on your preferred date.';
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
