<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { watch, onScopeDispose } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useAdoptionsStore } from '@/stores/adoptions';
import { useWatchlistStore } from '@/stores/watchlist';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { RouterView } from 'vue-router';
import AppNavbar from '@/components/shared/AppNavbar.vue';
const router = useRouter();
const route = useRoute(), auth = useAuthStore(), adoptions = useAdoptionsStore(), saved = useWatchlistStore();
function refreshPrivate() {
  if (auth.role !== 'customer') return;
  void adoptions.refresh();
  if (!saved.pendingOperations.size) void saved.fetchWatchlist({ force: true }).catch(() => {});
}
watch([() => route.path, () => auth.role], refreshPrivate, { immediate: true });
async function retrySession() {
  try {
    await auth.loadSession();
    if (route.meta.roles && !route.meta.roles.includes(auth.role)) {
      await router.replace(auth.isLoggedIn ? auth.homeRoute : { name: 'login', query: { redirect: route.fullPath } });
    }
  } catch { /* The session error remains visible. */ }
}
function visible() { if (document.visibilityState === 'visible') refreshPrivate(); }
document.addEventListener('visibilitychange', visible);
onScopeDispose(() => document.removeEventListener('visibilitychange', visible));
</script>

<template>
  <div class="app-layout flex flex-col" style="padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right)">
    <AppNavbar />
    <main class="app-main min-w-0 p-4 sm:p-5" style="padding-bottom: max(1rem, env(safe-area-inset-bottom))">
      <section v-if="!auth.ready" role="alert" class="mx-auto w-full max-w-md space-y-5">
        <h1>Connection unavailable</h1>
        <p>{{ auth.error }}</p>
        <Button :disabled="auth.sessionLoading" @click="retrySession" :loading="auth.sessionLoading"><AppIcon name="refresh" /><span class="sr-only">{{ auth.sessionLoading ? 'Checking…' : 'Retry' }}</span></Button>
      </section>
      <RouterView v-else-if="!route.meta.roles || route.meta.roles.includes(auth.role)" />
    </main>
  </div>
</template>

<style>
/* Every paginated page fills the viewport; only the path to its footer grows. */
.app-layout:has([data-slot='app-pagination']) {
  min-height: 100dvh;
}
.app-main:has([data-slot='app-pagination']),
.app-main :is(section, div):has([data-slot='app-pagination']) {
  display: flex;
  flex: 1;
  flex-direction: column;
}
.app-main [data-slot='app-pagination'] {
  flex-shrink: 0;
  margin-block-start: auto;
}
</style>
