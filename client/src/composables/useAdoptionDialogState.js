import { ref, computed, nextTick } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { recordId, canManagePickup } from '@/lib/adoptions';

export function useAdoptionDialogState({
  records,
  appointments,
  loading,
  loadError,
  pickupsReady,
  refresh,
  revealRecord,
  selectTab,
  internalNavigation,
}) {
  const titleNode = ref(null);
  const adoptionDialog = ref(null);
  const dialogOpen = ref(false);
  const context = ref({ recordId: '', appointmentId: '', initialMode: 'adoption' });
  const routeNotice = ref('');
  const updateAnnouncement = ref('');
  let dialogTrigger = null;
  let originScroll = 0;
  let dialogChanged = false;
  let triggerRecordId = '';
  const selectedRecord = computed(
    () => records.value.find((record) => record.id === context.value.recordId) || null,
  );
  const selectedAppointment = computed(
    () => appointments.value.find((item) => recordId(item) === context.value.appointmentId) || null,
  );
  function relatedRecord(appointment) {
    return (
      records.value.find((record) =>
        record.pickups.some((item) => recordId(item) === recordId(appointment)),
      ) || null
    );
  }
  function captureContext(id) {
    routeNotice.value = '';
    if (!dialogOpen.value) {
      dialogTrigger = document.activeElement;
      originScroll = window.scrollY;
      dialogChanged = false;
    }
    triggerRecordId = id;
  }
  function focusRecord(id) {
    const card = document.getElementById(`adoption-${id}`);
    if (!card || card.offsetParent === null) return false;
    const target = card.matches('button') ? card : card.querySelector('button');
    target?.focus({ preventScroll: true });
    card.scrollIntoView({ block: 'nearest' });
    return true;
  }
  function restoreFocus(event) {
    event.preventDefault();
    if (dialogChanged) {
      updateAnnouncement.value = '';
      nextTick(() => {
        updateAnnouncement.value = 'Your updated adoption is shown.';
      });
      if (!focusRecord(triggerRecordId)) document.getElementById('adoption-list-title')?.focus();
      return;
    }
    window.scrollTo({ top: originScroll });
    if (dialogTrigger?.isConnected && dialogTrigger.offsetParent !== null)
      dialogTrigger.focus({ preventScroll: true });
    else if (!focusRecord(triggerRecordId)) titleNode.value?.focus();
  }
  function showDetails(record) {
    captureContext(record.id);
    context.value = {
      recordId: record.id,
      appointmentId: recordId(record.appointment),
      initialMode: 'adoption',
    };
    dialogOpen.value = true;
  }
  function arrange(record) {
    if (!record.canArrange || !pickupsReady.value || loading.value || loadError.value) return;
    captureContext(record.id);
    context.value = { recordId: record.id, appointmentId: '', initialMode: 'create' };
    dialogOpen.value = true;
  }
  function showAppointment(appointment, edit = false) {
    const record = relatedRecord(appointment);
    captureContext(record?.id || `pickup-${recordId(appointment)}`);
    context.value = {
      recordId: record?.id || '',
      appointmentId: recordId(appointment),
      initialMode: edit && canManagePickup(record, appointment) ? 'edit' : 'view',
    };
    dialogOpen.value = true;
  }
  function showPickup(record) {
    if (record.canArrange) return arrange(record);
    if (record.appointment) return showAppointment(record.appointment);
  }
  async function withdrawn(id, reload = true) {
    const ready = reload ? await refresh() : !loadError.value && pickupsReady.value;
    const record = records.value.find((item) => item.id === id);
    if (record) await revealRecord(record, true);
    else await selectTab('history', true);
    dialogChanged = true;
    return ready;
  }
  async function viewHistory() {
    if (selectedRecord.value) await revealRecord(selectedRecord.value);
    else await selectTab('history', true);
    dialogOpen.value = false;
  }
  async function reconcilePickup() {
    const ready = await refresh();
    return { ready, record: selectedRecord.value, appointments: appointments.value };
  }
  async function changed(appointment, reload = true) {
    if (appointment && recordId(appointment)) {
      context.value.appointmentId = recordId(appointment);
    }
    const ready = reload ? await refresh() : !loadError.value && pickupsReady.value;
    const record = records.value.find((item) => item.id === context.value.recordId);
    if (record) await revealRecord(record, true);
    dialogChanged = true;
    return ready;
  }
  async function canNavigate() {
    if (internalNavigation.value) return true;
    return (await adoptionDialog.value?.canNavigate()) !== false;
  }
  onBeforeRouteLeave(canNavigate);
  onBeforeRouteUpdate(canNavigate);

  return {
    titleNode,
    adoptionDialog,
    dialogOpen,
    context,
    routeNotice,
    updateAnnouncement,
    selectedRecord,
    selectedAppointment,
    relatedRecord,
    showDetails,
    arrange,
    showAppointment,
    showPickup,
    withdrawn,
    viewHistory,
    reconcilePickup,
    changed,
    restoreFocus,
  };
}
