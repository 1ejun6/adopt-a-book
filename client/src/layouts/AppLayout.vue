<script setup>
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
  <div class="flex min-h-dvh flex-col" style="padding-left: env(safe-area-inset-left); padding-right: env(safe-area-inset-right)"> <!--@1ejun6 > as tall as browser screen > navbar on top & main below-->
    <AppNavbar />
    <main class="flex min-w-0 flex-1 p-4 sm:p-5" style="padding-bottom: max(1rem, env(safe-area-inset-bottom))"> <!--@1ejun6 > empty space left after navbar-->
      <section v-if="!auth.ready" role="alert" class="mx-auto w-full max-w-md space-y-5">
        <h1>Connection unavailable</h1>
        <p>{{ auth.error }}</p>
        <Button :disabled="auth.sessionLoading" @click="retrySession">{{ auth.sessionLoading ? 'Checking…' : 'Retry' }}</Button>
      </section>
      <RouterView v-else-if="!route.meta.roles || route.meta.roles.includes(auth.role)" />
    </main>
  </div>
</template>
