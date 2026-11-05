import { computed } from 'vue';
import { historyOutcome, historyAdoptionTabs } from '@/lib/myAdoptionsPresentation';
import {
  recordId,
  getApplicationDate,
  adoptionSection,
  getApplicationStatus,
  actionPriority,
  validPickupDate,
  journeyTabs,
  activeAdoptionStages,
  adoptionStage,
} from '@/lib/adoptions';

export function useAdoptionGroups({ records, appointments }) {
  const entries = computed(() => {
    const linked = new Set();
    const result = records.value.map((record) => {
      record.pickups.forEach((appointment) => linked.add(recordId(appointment)));
      return { id: `request-${record.id}`, kind: 'request', record };
    });
    for (const appointment of appointments.value) {
      if (!linked.has(recordId(appointment))) {
        result.push({ id: `pickup-${recordId(appointment)}`, kind: 'unlinked', appointment });
      }
    }
    return result;
  });
  const entryDate = (entry) =>
    Date.parse(
      entry.kind === 'request'
        ? getApplicationDate(entry.record.application)
        : entry.appointment.createdat,
    ) || 0;
  function entrySection(entry) {
    if (entry.kind === 'request') return adoptionSection(entry.record);
    return ['collected', 'cancelled', 'rejected'].includes(getApplicationStatus(entry.appointment))
      ? 'history'
      : 'active';
  }
  const groups = computed(() => {
    const result = { active: [], history: [] };
    for (const entry of entries.value) result[entrySection(entry)].push(entry);
    const stable = (a, b) => a.id.localeCompare(b.id);
    result.active.sort((a, b) => {
      const priority = (entry) => (entry.kind === 'unlinked' ? 0 : actionPriority(entry.record));
      const order = priority(a) - priority(b);
      if (order) return order;
      if (priority(a) === 2) {
        const pickupDate = (entry) =>
          validPickupDate(entry.record.appointment.appointmentdate)
            ? entry.record.appointment.appointmentdate
            : '9999';
        const dates = pickupDate(a).localeCompare(pickupDate(b));
        const time = (entry) =>
          /^([01]\d|2[0-3]):[0-5]\d/.test(entry.record.appointment.timeslot || '')
            ? entry.record.appointment.timeslot.slice(0, 5)
            : '99:99';
        return dates || time(a).localeCompare(time(b)) || stable(a, b);
      }
      return entryDate(b) - entryDate(a) || stable(a, b);
    });
    result.history.sort((a, b) => entryDate(b) - entryDate(a) || stable(a, b));
    return result;
  });
  const historyGroups = computed(() => Object.fromEntries(historyAdoptionTabs.map(item => [item.value, item.value === 'all' ? groups.value.history : groups.value.history.filter(entry => historyOutcome(entry) === item.value)])));
  const historyCounts = computed(() => Object.fromEntries(historyAdoptionTabs.map(item => [item.value, historyGroups.value[item.value].length])));
  const counts = computed(() =>
    Object.fromEntries(journeyTabs.map((item) => [item.value, groups.value[item.value].length])),
  );
  const stageValues = activeAdoptionStages.map((item) => item.value);
  function entryStage(entry) {
    return entry.kind === 'unlinked' ? 'needs-action' : adoptionStage(entry.record);
  }
  const stageGroups = computed(() => {
    const result = { 'needs-action': [], waiting: [], pickups: [], all: groups.value.active };
    for (const entry of groups.value.active) result[entryStage(entry)].push(entry);
    return result;
  });
  function entryAction(entry) {
    return entry.kind === 'request' && entry.record.canArrange && actionPriority(entry.record) === 1
      ? 'arrange'
      : 'check';
  }
  const actionGroups = computed(() => ({
    arrange: stageGroups.value['needs-action'].filter((entry) => entryAction(entry) === 'arrange'),
    check: stageGroups.value['needs-action'].filter((entry) => entryAction(entry) === 'check'),
  }));
  const entryWaiting = entry => entry.kind === 'request' && entry.record.code === 'pickup requested' ? 'confirmation' : 'approval';
  const waitingGroups = computed(() => ({
    approval: stageGroups.value.waiting.filter(entry => entryWaiting(entry) === 'approval'),
    confirmation: stageGroups.value.waiting.filter(entry => entryWaiting(entry) === 'confirmation'),
  }));
  const waitingCounts = computed(() => ({ approval: waitingGroups.value.approval.length, confirmation: waitingGroups.value.confirmation.length }));
  const defaultWaiting = computed(() => waitingCounts.value.approval ? 'approval' : 'confirmation');
  const actionCounts = computed(() => ({
    arrange: actionGroups.value.arrange.length,
    check: actionGroups.value.check.length,
  }));
  const defaultAction = computed(() => (actionCounts.value.check ? 'check' : 'arrange'));
  const stageCounts = computed(() =>
    Object.fromEntries(
      activeAdoptionStages.map((item) => [item.value, stageGroups.value[item.value].length]),
    ),
  );
  const defaultStage = computed(() => 'all');

  return {
    historyGroups, historyCounts,
    entryWaiting, waitingGroups, waitingCounts, defaultWaiting,
    entryAction,
    actionGroups,
    actionCounts,
    defaultAction,
    entries,
    entryDate,
    entrySection,
    groups,
    counts,
    stageValues,
    entryStage,
    stageGroups,
    stageCounts,
    defaultStage,
  };
}
