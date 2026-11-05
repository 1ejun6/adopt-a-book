import { watch } from 'vue';
import { recordId } from '@/lib/adoptions';

export function useAdoptionLinks({
  grouping,
  navigation,
  dialog,
  loading,
  loadError,
  pickupsReady,
  appointments,
  records,
  maxPage,
  revealRecord,
}) {
  const { entries, entrySection, actionGroups, groups } = grouping;
  const { route, tab, page, pageSize, normalisedQuery, updateQuery, selectTab } = navigation;
  const { relatedRecord, showAppointment, showDetails, arrange, routeNotice } = dialog;
  let handledLink = '';
  watch([loading, () => route.fullPath], async () => {
    if (loading.value || loadError.value) return;
    const request = typeof route.query.request === 'string' ? route.query.request : '';
    const application = typeof route.query.application === 'string' ? route.query.application : '';
    const appointmentId =
      typeof route.query.appointment === 'string' ? route.query.appointment : '';
    const key = `${request}|${application}|${appointmentId}|${route.query.edit || ''}`;
    if (!request && !application && !appointmentId) {
      handledLink = '';
      const query = normalisedQuery({ page: String(Math.min(page.value, maxPage.value)) });
      if (
        Object.keys({ ...route.query, ...query }).some((key) => route.query[key] !== query[key])
      ) {
        await updateQuery({ page: String(Math.min(page.value, maxPage.value)) }, true);
      }
      return;
    }
    if (key === handledLink || ((application || appointmentId) && !pickupsReady.value)) return;
    handledLink = key;
    if (appointmentId) {
      const appointment = appointments.value.find((item) => recordId(item) === appointmentId);
      if (appointment) {
        const record = relatedRecord(appointment);
        const edit = route.query.edit === 'true';
        if (record) await revealRecord(record);
        else {
          const entry = entries.value.find(
            (item) => item.kind === 'unlinked' && recordId(item.appointment) === appointmentId,
          );
          const section = entrySection(entry);
          const source = section === 'active' ? actionGroups.value.check : groups.value.history;
          const index = source.findIndex((item) => item === entry);
          await updateQuery(
            {
              tab: section,
              stage: section === 'active' ? 'needs-action' : undefined,
              action: 'check',
              search: undefined,
              page: String(Math.floor(Math.max(0, index) / pageSize) + 1),
            },
            true,
            true,
          );
        }
        showAppointment(appointment, edit);
        return;
      }
    } else {
      const record = records.value.find((item) => item.id === (request || application));
      if (record) {
        const edit = route.query.edit === 'true';
        await revealRecord(record);
        if (application && record.canArrange) arrange(record);
        else if (record.appointment && (application || edit))
          showAppointment(record.appointment, edit);
        else showDetails(record);
        return;
      }
    }
    routeNotice.value =
      'That adoption or pickup could not be found. Your current records are shown below.';
    await selectTab(tab.value, true);
  });

  return {};
}
