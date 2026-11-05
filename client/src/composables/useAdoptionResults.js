import { computed, watch } from 'vue';
import { historyAdoptionTabs } from '@/lib/myAdoptionsPresentation';
import { recordId, bookAuthors, actionPriority } from '@/lib/adoptions';

export function useAdoptionResults({ grouping, navigation, loading, loadError, pickupError }) {
  const { entries, entryDate, entrySection, stageGroups, stageCounts, actionGroups, waitingGroups, historyGroups } =
    grouping;
  const { search, searching, tab, stage, action, waiting, history, page, pageSize, updateQuery } = navigation;
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
          : stage.value === 'waiting' ? waitingGroups.value[waiting.value] : stageGroups.value[stage.value]
        : historyGroups.value[history.value]
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
          description: 'these pickup times have passed. check with the team before you travel.',
        },
        {
          key: 'check',
          title: 'Check these details',
          description: 'open a book to see which details need checking.',
        },
        {
          key: 'unlinked',
          title: 'Pickup records to check',
          description:
            'we couldn’t match these pickups to a book request. check with the team.',
        },
        {
          key: 'arrange',
          title: 'Arrange a pickup',
          description: 'your request is approved. choose a pickup date and two times at the book’s mrt station.',
        },
        {
          key: 'confirmed',
          title: 'Your confirmed pickups',
          description:
            'your pickup is confirmed. open a book to check the details or change the time.',
        },
        {
          key: 'confirmation',
          title: 'Waiting for pickup confirmation',
          description:
            'the team will confirm one of your times. wait for confirmation before you travel.',
        },
        {
          key: 'review',
          title: 'Waiting for book approval',
          description:
            'the team is reviewing your request. check my adoptions for updates.',
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
      return 'past pickup dates are marked below. check with the team before travelling.';
    if (searching.value) return '';
    if (tab.value === 'history') return {
      all: 'collected books and requests that have ended.',
      collected: 'books you have collected.',
      withdrawn: 'book requests you withdrew.',
      rejected: 'book requests that were rejected.',
      'cancelled-pickups': 'cancelled pickups without a linked book request.',
      'declined-pickups': 'declined pickups without a linked book request.',
    }[history.value];
    return '';
  });
  const maxPage = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
  const hasUnlinked = computed(() => filtered.value.some((entry) => entry.kind === 'unlinked'));
  const listTitle = computed(() =>
    searching.value
      ? 'Search results'
      : tab.value === 'history'
        ? historyAdoptionTabs.find(item => item.value === history.value).label
        : {
            'needs-action': 'Your next steps',
            waiting: waiting.value === 'approval' ? 'Waiting for adoption approval' : 'Waiting for pickup confirmation',
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
      return ['No matching results', 'try a different title, author or reference number.'];
    if (pickupError.value)
      return [
        'Pickup status unavailable',
        'retry pickup information before arranging a collection or travelling.',
      ];
    if (tab.value === 'history')
      return history.value === 'all'
        ? ['No history yet', 'collected books and requests that have ended will appear here.']
        : ['No matching history', 'requests with this outcome will appear here.'];
    if (stage.value === 'needs-action')
      return action.value === 'arrange'
        ? [
            'No pickups to arrange',
            'approved books that are ready for a pickup request will appear here.',
          ]
        : [
            'No pickups to check',
            'pickup dates or details needing your attention will appear here.',
          ];
    if (stage.value === 'waiting')
      return [
        waiting.value === 'approval' ? 'No adoptions awaiting approval' : 'No pickups awaiting confirmation',
        waiting.value === 'approval' ? 'book requests appear here while the team reviews them.' : 'pickup requests appear here while the team chooses a time.',
      ];
    if (stage.value === 'pickups')
      return [
        'No confirmed pickups',
        'once a pickup is confirmed, its time and location appear here.',
      ];
    return [
      'No active adoptions',
      'find a book you’d like to adopt. follow your request and arrange pickup here.',
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
