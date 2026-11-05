import { onScopeDispose, watch } from 'vue';
import { toast } from 'vue-sonner';

// Announce each empty query once, without stacking notices during background refreshes.
export function useEmptyStateToast(read) {
  let toastId;
  let lastKey = '';
  function dismiss() {
    if (toastId !== undefined) toast.dismiss(toastId);
    toastId = undefined;
  }
  watch(read, state => {
    if (state.loading) { dismiss(); return; }
    if (!state.empty) { dismiss(); lastKey = ''; return; }
    const key = JSON.stringify([state.key, state.title, state.description]);
    if (key === lastKey) return;
    dismiss();
    lastKey = key;
    toastId = toast.info(state.title, {
      description: state.description,
      duration: Infinity,
      closeButton: true,
      ...(state.action ? { action: state.action } : {}),
    });
  }, { immediate: true, flush: 'post' });
  onScopeDispose(dismiss);
}
