import { adoptionSection } from '@/lib/adoptions';

export function useAdoptionReveal({ grouping, navigation, results }) {
  const { entries, entryStage, groups, stageGroups, actionGroups, entryAction, waitingGroups, entryWaiting } = grouping;
  const { searching, tab, stage, pageSize, updateQuery, clearSearchOrigin } = navigation;
  const { matchesSearch, filtered } = results;
  async function revealRecord(record, preserve = false) {
    const selected = adoptionSection(record);
    const entry = entries.value.find(
      (item) => item.kind === 'request' && item.record.id === record.id,
    );
    if (preserve && searching.value && entry && matchesSearch(entry)) {
      const index = filtered.value.findIndex((item) => item.id === entry.id);
      await updateQuery(
        { page: String(Math.floor(Math.max(0, index) / pageSize) + 1) },
        true,
        true,
      );
      return;
    }
    const selectedStage =
      preserve && tab.value === 'active' && stage.value === 'all'
        ? 'all'
        : entry
          ? entryStage(entry)
          : 'needs-action';
    const selectedAction = entry ? entryAction(entry) : 'check';
    const selectedWaiting = entry ? entryWaiting(entry) : 'approval';
    const source =
      selected === 'active'
        ? selectedStage === 'needs-action'
          ? actionGroups.value[selectedAction]
          : selectedStage === 'waiting' ? waitingGroups.value[selectedWaiting] : stageGroups.value[selectedStage]
        : groups.value.history;
    const index = source.findIndex(
      (item) => item.kind === 'request' && item.record.id === record.id,
    );
    clearSearchOrigin();
    await updateQuery(
      {
        tab: selected,
        stage: selected === 'active' ? selectedStage : undefined,
        action: selectedAction,
        waiting: selectedWaiting,
        search: undefined,
        page: String(Math.floor(Math.max(0, index) / pageSize) + 1),
      },
      true,
      true,
    );
  }

  return { revealRecord };
}
