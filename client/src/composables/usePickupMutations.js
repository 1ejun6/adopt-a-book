import { useAdoptionsStore } from '@/stores/adoptions';
import {
  recordId,
  bookId,
  getApplicationStatus,
  activePickup,
  canManagePickup,
  validPickupDate,
} from '@/lib/adoptions';
import { availablePickupSlot } from '@/lib/pickupTimes';
import { todayInSingapore } from '@/lib/utils';

export function usePickupMutations(props, state, review) {
  const adoptions = useAdoptionsStore();
  const {
    selectedSlot,
    step,
    saving,
    uncertain,
    operation,
    result,
    refreshWarning,
    confirming,
    initialDraft,
    error,
    draft,
    saved,
    today,
    manageable,
    eligible,
    changed,
  } = state;
  // Acknowledged mutations stay successful even if the following list refresh fails.
  async function finish(appointment, kind, reload = true) {
    saved.value = appointment;
    selectedSlot.value = '';
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
      if (pending.kind === 'accept' && current) {
        if (
          getApplicationStatus(current) === 'appointment confirmed' &&
          current.proposalversion === pending.version &&
          current.appointmentdate === pending.slot.appointmentdate &&
          current.timeslot === pending.slot.timeslot
        ) {
          await finish(current, 'confirmed', false);
        } else {
          uncertain.value = false;
          selectedSlot.value = '';
          error.value =
            'Your choice was not confirmed. Review the latest pickup options before trying again.';
        }
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
      const { response } = await adoptions.saveAppointment({
        id: existingId,
        bookId: props.record.bookId,
        ...body,
      });
      if (!recordId(response?.appointment)) throw new Error('receipt unavailable');
      await finish(response.appointment, 'sent', false);
    } catch {
      uncertain.value = true;
      await checkStatus();
    } finally {
      saving.value = false;
    }
  }
  async function acceptSlot() {
    const index = Number(selectedSlot.value);
    const slot = props.appointment?.pickupoptions?.[index];
    if (saving.value || uncertain.value || !manageable.value || selectedSlot.value === '')
      return;
    if (!availablePickupSlot(slot)) {
      error.value = 'That pickup time has passed. Choose another time or request a change.';
      return;
    }
    saving.value = true;
    error.value = '';
    operation.value = {
      kind: 'accept',
      id: recordId(props.appointment),
      slot: { ...slot },
      version: props.appointment.proposalversion,
    };
    try {
      const { response } = await adoptions.saveAppointment({
        id: recordId(props.appointment),
        bookId: props.record.bookId,
        choice: { proposalversion: operation.value.version, slot: index },
      });
      if (getApplicationStatus(response?.appointment) !== 'appointment confirmed')
        throw new Error('Confirmation unavailable');
      await finish(response.appointment, 'confirmed', false);
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
      const receipt = { ...props.appointment, status: 'cancelled' };
      await adoptions.cancelAppointment(recordId(props.appointment));
      await finish(receipt, 'cancelled', false);
    } catch {
      uncertain.value = true;
      await checkStatus();
    } finally {
      saving.value = false;
    }
  }
  return { checkStatus, submit, cancelPickup, acceptSlot };
}
