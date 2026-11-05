import { computed, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export function useAdoptionNavigation({ stageValues, defaultStage, defaultAction }) {
  const route = useRoute();
  const router = useRouter();
  const rememberedStage = ref('');
  const stage = computed({
    get: () => {
      if (stageValues.includes(route.query.stage)) return route.query.stage;
      const legacy = [route.query.tab, route.query.section, route.query.view, route.query.status];
      if (legacy.some((value) => ['pickups', 'confirmed', 'collections'].includes(value)))
        return 'pickups';
      if (legacy.some((value) => ['actions', 'next'].includes(value))) return 'needs-action';
      if (legacy.includes('waiting')) return 'waiting';
      return rememberedStage.value || defaultStage.value;
    },
    set: (value) => selectStage(value),
  });
  watch(
    () => [route.query.stage, routeTab()],
    ([value, section]) => {
      if (stageValues.includes(value)) rememberedStage.value = value;
      else if (section === 'active') rememberedStage.value = '';
    },
    { immediate: true },
  );
  const action = computed({
    get: () =>
      ['arrange', 'check'].includes(route.query.action) ? route.query.action : defaultAction.value,
    set: (value) => {
      if (!['arrange', 'check'].includes(value)) return;
      return updateQuery(
        { action: value, page: String(rememberedPages[activePageKey('needs-action', value)] || 1) },
        false,
        true,
      );
    },
  });
  function activePageKey(value = stage.value, selectedAction = action.value) {
    return `active:${value}${value === 'needs-action' ? `:${selectedAction}` : ''}`;
  }
  function normaliseTab(value) {
    if (value === 'history') return 'history';
    if (
      [
        'active',
        'requests',
        'pickups',
        'confirmed',
        'collections',
        'actions',
        'waiting',
        'next',
      ].includes(value)
    )
      return 'active';
    return '';
  }
  function routeTab() {
    for (const value of [
      route.query.tab,
      route.query.section,
      route.query.view,
      route.query.status,
    ]) {
      const result = normaliseTab(value);
      if (result) return result;
    }
    return 'active';
  }
  const tab = computed({ get: routeTab, set: (value) => selectTab(value) });
  const rememberedPages = { history: 1, search: 1 };
  const pageSize = 10;
  let searchOrigin = null;
  const internalNavigation = ref(false);
  function normalisedQuery(changes = {}, consumeAction = false) {
    const query = { ...route.query, tab: tab.value, ...changes };
    for (const key of ['view', 'status', 'layout', 'section', 'filter']) delete query[key];
    if (query.tab === 'active') {
      query.stage = stageValues.includes(query.stage) ? query.stage : stage.value;
      if (query.stage === 'needs-action')
        query.action = ['arrange', 'check'].includes(query.action) ? query.action : action.value;
      else delete query.action;
      if (query.stage === defaultStage.value) delete query.stage;
      delete query.tab;
    } else {
      delete query.stage;
      delete query.action;
    }
    if (consumeAction) {
      for (const key of ['request', 'application', 'appointment', 'edit']) delete query[key];
    }
    for (const key of Object.keys(query)) {
      if (
        query[key] === undefined ||
        query[key] === '' ||
        (key === 'page' && Number(query[key]) === 1)
      )
        delete query[key];
    }
    return query;
  }
  async function updateQuery(changes, replace = false, consumeAction = false) {
    const query = normalisedQuery(changes, consumeAction);
    internalNavigation.value = true;
    try {
      return await router[replace ? 'replace' : 'push']({ query, hash: route.hash });
    } finally {
      internalNavigation.value = false;
    }
  }
  const search = computed({
    get: () => (typeof route.query.search === 'string' ? route.query.search : ''),
    set: async (value) => {
      if (value.trim() && !search.value.trim())
        searchOrigin = { query: { ...route.query }, scroll: window.scrollY };
      if (!value.trim() && searchOrigin) {
        const origin = searchOrigin;
        searchOrigin = null;
        await router.replace({ query: origin.query });
        await nextTick();
        window.scrollTo({ top: origin.scroll });
        return;
      }
      await updateQuery(
        {
          search: value.trim() ? value : undefined,
          page: value.trim()
            ? undefined
            : String(rememberedPages[tab.value === 'active' ? activePageKey() : tab.value] || 1),
        },
        true,
        true,
      );
    },
  });
  const searching = computed(() => !!search.value.trim());
  const pageKey = computed(() =>
    searching.value ? 'search' : tab.value === 'active' ? activePageKey() : tab.value,
  );
  const page = computed({
    get: () => {
      const value = Number(route.query.page);
      return Number.isSafeInteger(value) && value > 0 ? value : 1;
    },
    set: async (value) => {
      await updateQuery({ page: String(value) });
      await nextTick();
      document.getElementById('adoption-list-title')?.focus({ preventScroll: true });
      document.getElementById('adoption-list-title')?.scrollIntoView({ block: 'start' });
    },
  });
  watch(
    [pageKey, page],
    ([key, value]) => {
      rememberedPages[key] = value;
    },
    { immediate: true },
  );
  async function selectTab(value, replace = false) {
    const selected = normaliseTab(value);
    if (!selected) return;
    searchOrigin = null;
    return updateQuery(
      {
        tab: selected,
        stage: selected === 'active' ? stage.value : undefined,
        search: undefined,
        page: String(rememberedPages[selected === 'active' ? activePageKey() : selected] || 1),
      },
      replace,
      true,
    );
  }
  async function selectStage(value) {
    if (!stageValues.includes(value)) return;
    searchOrigin = null;
    await updateQuery(
      {
        tab: 'active',
        stage: value,
        search: undefined,
        page: String(rememberedPages[activePageKey(value)] || 1),
      },
      false,
      true,
    );
  }
  function clearSearchOrigin() {
    searchOrigin = null;
  }

  return {
    action,
    route,
    stage,
    tab,
    search,
    searching,
    page,
    pageKey,
    pageSize,
    internalNavigation,
    normalisedQuery,
    updateQuery,
    selectTab,
    selectStage,
    clearSearchOrigin,
  };
}
