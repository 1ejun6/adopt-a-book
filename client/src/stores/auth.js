import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api, invalidateApiSession } from '@/lib/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null), ready = ref(false), sessionLoading = ref(false);
  const loginLoading = ref(false), logoutLoading = ref(false), error = ref('');
  const isLoggedIn = computed(() => !!user.value);
  const role = computed(() => user.value?.role || 'guest');
  const homeRoute = computed(() => ({ name: role.value === 'admin' ? 'adminBooks' : role.value === 'customer' ? 'customerHome' : 'guestHome' }));
  let version = 0, pending;
  function invalidate() {
    invalidateApiSession();
    version++;
    pending = undefined;
    sessionLoading.value = false;
  }
  function clearSession() {
    invalidate();
    user.value = null;
    ready.value = true;
    error.value = '';
  }
  function updateUser(details) { if (user.value) user.value = { ...user.value, ...details }; }
  function loadSession() {
    if (ready.value) return Promise.resolve();
    if (pending) return pending;
    const current = version;
    sessionLoading.value = true;
    error.value = '';
    pending = (async () => {
      try {
        const response = await api('/session');
        if (current !== version) return;
        user.value = response.user;
        ready.value = true;
      } catch (failure) {
        if (current !== version) return;
        if (failure.status === 401) {
          clearSession();
          return;
        }
        error.value = failure.message;
        throw failure;
      } finally {
        if (current === version) {
          sessionLoading.value = false;
          pending = undefined;
        }
      }
    })();
    return pending;
  }
  async function login(credentials) {
    if (loginLoading.value) return;
    invalidate();
    const current = version;
    loginLoading.value = true;
    error.value = '';
    try {
      const response = await api('/login', { method: 'POST', body: credentials });
      if (current !== version) throw new Error('Session changed; please try again');
      user.value = response.user;
      ready.value = true;
      return response;
    } catch (failure) {
      error.value = failure.message;
      throw failure;
    } finally {
      loginLoading.value = false;
    }
  }
  async function logout() {
    if (logoutLoading.value) return;
    invalidate();
    const current = version;
    logoutLoading.value = true;
    error.value = '';
    try {
      await api('/logout', { method: 'POST' });
      if (current === version) clearSession();
    } catch (failure) {
      if (current !== version) throw failure;
      if ([429, 503].includes(failure.status) && failure.message === 'could not revoke your session; authentication service unavailable') clearSession();
      error.value = failure.message;
      throw failure;
    } finally {
      logoutLoading.value = false;
    }
  }
  return { user, ready, sessionLoading, loginLoading, logoutLoading, error, isLoggedIn, role, homeRoute, loadSession, login, logout, clearSession, updateUser };
});
