import { ref, watch, onScopeDispose } from 'vue';
import { useVisibleRefresh } from '@/composables/useVisibleRefresh';
import { api } from '@/lib/api';

// An open row is a snapshot. Reload it before allowing decisions, and after writes.
export function useAdminRecord(selected, open, endpoint, key, { busy = () => false } = {}) {
  const error = ref(''), loading = ref(false);
  let revision = 0;
  async function refresh() {
    const id = selected.value?.id;
    const current = ++revision;
    if (!id || !open.value) { loading.value = false; error.value = ''; return; }
    loading.value = true;
    error.value = '';
    try {
      const response = await api(`${endpoint}/${id}`);
      if (current !== revision) return;
      if (!response[key]?.id) throw new Error('Record unavailable. Refresh before making changes.');
      selected.value = response[key];
    } catch (failure) {
      if (current === revision) error.value = failure.message;
    } finally {
      if (current === revision) loading.value = false;
    }
  }
  watch([open, () => selected.value?.id], refresh);
  useVisibleRefresh(refresh, { busy: () => loading.value || busy() });
  onScopeDispose(() => revision++);
  return { detailError: error, detailLoading: loading, refreshDetail: refresh };
}
