import { ref } from 'vue';
export const currentTime = ref(Date.now());
export function startClock() {
  const update = () => { currentTime.value = Date.now(); };
  const timer = setInterval(update, 60000);
  document.addEventListener('visibilitychange', update);
  return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); };
}
