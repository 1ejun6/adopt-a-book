import { nextTick, onScopeDispose } from 'vue';

export function usePickupNavigation(
  props,
  open,
  emit,
  state,
  { fillDraft, changeField, focusField },
) {
  const { step, saving, result, confirmClose, closeNode, initialDraft, draft, draftChanged } =
    state;
  let closeAction = 'close';
  let navigationDecision = null;
  function resolveNavigation(allowed) {
    navigationDecision?.(allowed);
    navigationDecision = null;
  }
  onScopeDispose(() => resolveNavigation(false));
  async function keepEditing() {
    resolveNavigation(false);
    closeAction = 'close';
    confirmClose.value = false;
    if (draftChanged.value && state.selectedSlot.value === '') step.value = 'details';
    await nextTick();
    if (draftChanged.value && state.selectedSlot.value === '') {
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
  function resetNavigation() {
    closeAction = 'close';
  }
  return {
    keepEditing,
    discardChanges,
    back,
    updateOpen,
    leaveReceipt,
    canNavigate,
    resetNavigation,
  };
}
