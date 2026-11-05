import { computed, watch } from 'vue';
import { recordId, bookAuthors, actionPriority } from '@/lib/adoptions';

export function useAdoptionResults({ grouping, navigation, loading, loadError, pickupError }) {
  const { entries, entryDate, entrySection, groups, stageGroups, stageCounts, actionGroups } =
    grouping;
  const { search, searching, tab, stage, action, page, pageSize, updateQuery } = navigation;
  function matchesSearch(entry, query = search.value.trim().toLocaleLowerCase()) {
    if (!query) return true;
    const book = entry.kind === 'request' ? entry.record.book : null;
    const title = book?.title || entry.appointment?.booktitle || '';
    const references =
      entry.kind === 'unlinked'
        ? [recordId(entry.appointment)]
        : [entry.record.id, ...entry.record.pickups.map(recordId)];
    return (
      `${title} ${book ? bookAuthors(book) : ''}`.toLocaleLowerCase().includes(query) ||
      references.some((id) => String(id).toLocaleLowerCase() === query)
    );
  }
  const filtered = computed(() =>
    (searching.value
      ? [...entries.value].sort((a, b) => entryDate(b) - entryDate(a) || a.id.localeCompare(b.id))
      : tab.value === 'active'
        ? stage.value === 'needs-action'
          ? actionGroups.value[action.value]
          : stageGroups.value[stage.value]
        : groups.value.history
    ).filter((entry) => matchesSearch(entry)),
  );
  const paged = computed(() =>
    filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
  );
  const overdueCount = computed(
    () =>
      paged.value.filter(
        (entry) => entry.kind === 'request' && entry.record.warning === 'Pickup times have passed',
      ).length,
  );
  function entryTask(entry) {
    if (entry.kind === 'unlinked') return 'unlinked';
    if (entry.record.warning === 'Pickup times have passed') return 'past';
    if (actionPriority(entry.record) === 0) return 'check';
    if (entry.record.canArrange) return 'arrange';
    if (entry.record.code === 'pickup confirmed') return 'confirmed';
    if (entry.record.code === 'pickup requested') return 'confirmation';
    if (['pending', 'pending review'].includes(entry.record.code)) return 'review';
    return 'check';
  }
  const taskGroups = computed(() => {
    let definitions;
    if (searching.value) {
      definitions = [
        { key: 'active', title: 'Active', matches: (entry) => entrySection(entry) === 'active' },
        { key: 'history', title: 'History', matches: (entry) => entrySection(entry) === 'history' },
      ];
    } else if (tab.value === 'history') {
      definitions = [{ key: 'history', title: '', matches: () => true }];
    } else {
      definitions = [
        {
          key: 'past',
          title: 'Check your pickup',
          description: 'These pickup times have passed. Check with the team before travelling.',
        },
        {
          key: 'check',
          title: 'Check these details',
          description: 'Some information needs checking. Open a book to see what needs attention.',
        },
        {
          key: 'unlinked',
          title: 'Pickup records to check',
          description:
            'These pickups couldn’t be linked to a book request. Check the details with the team.',
        },
        {
          key: 'arrange',
          title: 'Arrange a pickup',
          description: 'Your book is approved. Choose a preferred meeting point and time.',
        },
        {
          key: 'confirmed',
          title: 'Your confirmed pickups',
          description:
            'Your time and meeting point are confirmed. Open a book to view or change them.',
        },
        {
          key: 'confirmation',
          title: 'Waiting for pickup confirmation',
          description:
            'The team is choosing one of your available times. Wait for confirmation before travelling.',
        },
        {
          key: 'review',
          title: 'Waiting for book approval',
          description:
            'No action needed yet. You can arrange pickup once your request is approved.',
        },
      ].map((group) => ({ ...group, matches: (entry) => entryTask(entry) === group.key }));
    }
    return definitions
      .map((group) => ({
        ...group,
        entries: paged.value.filter(group.matches),
      }))
      .filter((group) => group.entries.length);
  });
  const listHint = computed(() => {
    if (searching.value && overdueCount.value)
      return 'Past pickup dates are marked below. Check with the team before travelling.';
    if (searching.value) return '';
    if (tab.value === 'history') return 'Collected books and requests that have ended.';
    return '';
  });
  const maxPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
  const hasUnlinked = computed(() => filtered.value.some((entry) => entry.kind === 'unlinked'));
  const listTitle = computed(() =>
    searching.value
      ? 'Search results'
      : tab.value === 'history'
        ? 'History'
        : {
            'needs-action': 'Your next steps',
            waiting: 'Waiting for the team',
            pickups: 'Your confirmed pickups',
            all: 'All your current adoptions',
          }[stage.value],
  );
  watch([maxPage, page, loading], ([max, current, busy]) => {
    if (!busy && !loadError.value && current > max) updateQuery({ page: String(max) }, true);
  });
  const emptyStageTarget = computed(() =>
    ['needs-action', 'pickups', 'waiting'].find(
      (value) => value !== stage.value && stageCounts.value[value],
    ),
  );
  const emptyStageAction = computed(
    () =>
      ({
        'needs-action': 'View books needing action',
        pickups: 'View pickups',
        waiting: 'View waiting requests',
      })[emptyStageTarget.value],
  );
  const emptyPickups = computed(
    () =>
      !searching.value && !pickupError.value && tab.value === 'active' && stage.value === 'pickups',
  );
  const emptyCopy = computed(() => {
    if (searching.value)
      return ['No matching results', 'Try a different title, author or reference number.'];
    if (pickupError.value)
      return [
        'Pickup status unavailable',
        'Retry pickup information before arranging a collection or travelling.',
      ];
    if (tab.value === 'history')
      return ['No history yet', 'Collected books and requests that have ended will appear here.'];
    if (stage.value === 'needs-action')
      return action.value === 'arrange'
        ? [
            'No pickups to arrange',
            'Approved books that are ready for a pickup request will appear here.',
          ]
        : [
            'No pickups to check',
            'Pickup dates or details needing your attention will appear here.',
          ];
    if (stage.value === 'waiting')
      return [
        'No requests awaiting a response',
        'Requests appear here while the team reviews a book request or confirms a pickup.',
      ];
    if (stage.value === 'pickups')
      return [
        'No confirmed pickups',
        'Once a pickup is confirmed, its time and location appear here.',
      ];
    return [
      'No active adoptions',
      'Find a book you’d like to adopt. Follow your request and arrange pickup here.',
    ];
  });

  return {
    matchesSearch,
    filtered,
    paged,
    overdueCount,
    taskGroups,
    listHint,
    maxPage,
    hasUnlinked,
    listTitle,
    emptyStageTarget,
    emptyStageAction,
    emptyPickups,
    emptyCopy,
  };
}
