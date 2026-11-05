import { useVisibleRefresh } from '@/composables/useVisibleRefresh';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';

//@lee-hlmilk > views own filters/actions > this composable owns server pages &&& request state
export function useServerPagination({ endpoint, filters, selectedIds, query = () => ({ ...filters }), read, busy = () => false, beforeLoad = () => {}, onResponse = () => {} }) {
    const rows = ref([]);
    const page = ref(1);
    const pageSize = 15;
    const total = ref(0);
    const counts = ref({});
    const loading = ref(false);
    const loadError = ref('');
    const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
    let requestId = 0;
    let timer;
    let requestedSearch = filters.search;
    let disposed = false;

    async function refresh() {
        if (disposed) { return; }
        clearTimeout(timer);
        const id = ++requestId;
        requestedSearch = filters.search;
        loading.value = true;
        loadError.value = '';
        selectedIds.value = [];
        beforeLoad();
        try {
            const response = await api(endpoint, { query: { ...query(), page: page.value, limit: pageSize } });
            if (id !== requestId) { return; }
            total.value = response.total;
            counts.value = response.counts;
            if (page.value > pageCount.value) { page.value = pageCount.value; return; }
            rows.value = read(response);
            onResponse(response);
        } catch (error) {
            if (id !== requestId) { return; }
            rows.value = [];
            loadError.value = error.message;
            toast.error(error.message, { action: { label: 'retry', onClick: refresh } });
        } finally {
            if (id === requestId) { loading.value = false; }
        }
    }

    //@lee-hlmilk > invalidate immediately > old responses cannot repopulate rows while a typed search waits
    watch(() => [page.value, JSON.stringify(filters)], (value, previous) => {
        requestId++;
        clearTimeout(timer);
        selectedIds.value = [];
        rows.value = [];
        loading.value = true;
        loadError.value = '';
        const changedFilters = value[1] !== previous[1];
        if (changedFilters && page.value !== 1) { page.value = 1; return; }
        timer = setTimeout(refresh, filters.search !== requestedSearch ? 250 : 0);
    });

    useVisibleRefresh(refresh, { busy: () => loading.value || busy() });
    onScopeDispose(() => { disposed = true; requestId++; clearTimeout(timer); });
    return { rows, page, pageSize, total, counts, pageCount, loading, loadError, refresh };
}
