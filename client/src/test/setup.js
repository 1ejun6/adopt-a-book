import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { config, enableAutoUnmount } from '@vue/test-utils';
import HugeiconsPlugin from '@hugeicons/vue';
import axios from 'axios';
import { server } from './server';
import { auth } from '@/lib/auth';

//@ChitanyaBharathi > msw cannot see jsdom's XMLHttpRequest > send axios requests through fetch so msw catches them
axios.defaults.adapter = 'fetch';

//@ChitanyaBharathi > toasts are mocked everywhere > tests check toast.error(...) etc were called
vi.mock('vue-sonner', () => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(() => 'loading-toast'),
    dismiss: vi.fn(),
  });
  return { toast, Toaster: { name: 'Toaster', render: () => null } };
});

//@ChitanyaBharathi > HugeiconsIcon is registered globally in main.js > register it for every mount too
config.global.plugins = [HugeiconsPlugin];

//@ChitanyaBharathi > jsdom is missing these browser apis > reka-ui components need them
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;
window.matchMedia ??= (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
});
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.setPointerCapture ??= () => {};

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  vi.useRealTimers();
  localStorage.clear();
  auth.user = null;
  auth.ready = false;
  document.body.innerHTML = '';
});

//@ChitanyaBharathi > registered last so it runs first > unmount dialogs before the body is cleared
enableAutoUnmount(afterEach);

afterAll(() => server.close());
