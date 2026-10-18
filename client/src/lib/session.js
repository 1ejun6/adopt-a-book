import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

let pending;

export async function loadSession() {
  if (auth.ready) { return; }
  if (pending) { return pending; }
  
  pending = (async () => {
    try {
      const response = await api('/session');
      if (!auth.ready) { auth.user = response.user; }
      auth.ready = true;
    } catch (error) {
      if (error.status !== 401) { throw error; }
    } finally {
      pending = null;
    }
  })();
  return pending;
}

export async function logoutSession() {
  await api('/logout', { method: 'POST' });
  auth.user = null;
  auth.ready = true;
}
