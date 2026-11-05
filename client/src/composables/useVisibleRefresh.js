import { onScopeDispose } from 'vue';

export function useVisibleRefresh(refresh, { interval = false, busy = () => false } = {}) {
  function run() {
    if (document.visibilityState === 'visible' && !busy()) void refresh();
  }
  document.addEventListener('visibilitychange', run);
  const timer = interval ? setInterval(run, 60000) : undefined;
  onScopeDispose(() => {
    document.removeEventListener('visibilitychange', run);
    clearInterval(timer);
  });
}
