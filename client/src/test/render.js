import { defineComponent, h } from 'vue';
import { RouterView } from 'vue-router';
import { flushPromises, mount } from '@vue/test-utils';
import { router } from '@/router';

//@ChitanyaBharathi > mounts the real app at a url > real router guards, real auth, real api > only network is faked
export async function renderRoute(path) {
  const Root = defineComponent({ render: () => h(RouterView) });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(Root, { global: { plugins: [router] }, attachTo: document.body });
  await flushPromises();
  return { wrapper, router };
}

//@ChitanyaBharathi > mounts one component with the real router installed > for components using RouterLink \ useRouter
export async function mountWithRouter(component, options = {}, path = '/') {
  await router.push(path);
  await router.isReady();
  const wrapper = mount(component, {
    attachTo: document.body,
    ...options,
    global: { ...options.global, plugins: [router, ...(options.global?.plugins || [])] },
  });
  await flushPromises();
  return { wrapper, router };
}

//@ChitanyaBharathi > dialogs teleport into document.body > wrapper.find cannot see them
export const body = () => document.body;
//@ChitanyaBharathi > joins text nodes with spaces > <dt>venue</dt><dd>Bishan</dd> reads as "venue Bishan"
export function bodyText() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const parts = [];
  while (walker.nextNode()) {
    const text = walker.currentNode.textContent.trim();
    if (text) { parts.push(text); }
  }
  return parts.join(' ').replace(/\s+/g, ' ');
}

//@ChitanyaBharathi > waits for a condition (api calls, re-renders) > fails after the timeout
export async function waitFor(check, timeout = 1000) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeout) {
    try {
      const result = await check();
      if (result !== false) { return result; }
    } catch (error) {
      lastError = error;
    }
    await flushPromises();
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw lastError || new Error('waitFor timed out');
}
