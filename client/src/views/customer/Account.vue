<script setup>
import AppPage from '@/components/shared/AppPage.vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CustomerProfileDialog from '@/components/customer/CustomerProfileDialog.vue';

const account = ref(null);
const loading = ref(true);
const loadError = ref('');
const initials = computed(() => account.value?.name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'R');
let controller;

async function loadAccount() {
  controller?.abort();
  const request = new AbortController();
  controller = request;
  loading.value = true;
  loadError.value = '';
  try {
    const response = await api('/customer/profile', { signal: request.signal });
    if (!response.account) throw new Error('could not load your account');
    account.value = response.account;
  } catch (error) {
    if (!request.signal.aborted) loadError.value = error.message;
  } finally {
    if (controller === request) loading.value = false;
  }
}

function updateDetails(details) {
  account.value = { ...account.value, ...details };
  if (auth.user) Object.assign(auth.user, details);
}

onMounted(loadAccount);
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <AppPage aria-labelledby="account-title">
    <div class="space-y-8 text-center">
      <header class="space-y-2">
        <h1 id="account-title" class="text-4xl">My account</h1>
        <p class="text-muted-foreground text-sm">your details, in one place</p>
      </header>

      <div v-if="loading" class="mx-auto w-full max-w-sm space-y-6" role="status" aria-busy="true">
        <span class="sr-only">Loading your account</span>
        <div class="flex flex-col items-center gap-3">
          <Skeleton class="size-16 rounded-full" />
          <Skeleton class="h-7 w-40" />
          <Skeleton class="h-4 w-24" />
        </div>
        <Skeleton class="mx-auto h-20 w-full max-w-xs" />
      </div>
      <div v-else-if="loadError" class="mx-auto w-full max-w-sm space-y-4" role="alert">
        <h2 class="text-xl">We couldn’t load your details</h2>
        <p class="text-sm">{{ loadError }}</p>
        <Button class="min-h-11" @click="loadAccount">Try again</Button>
      </div>
      <article v-else-if="account" class="mx-auto w-full max-w-sm space-y-6">
        <header class="flex flex-col items-center gap-3">
          <span class="grid size-16 shrink-0 place-items-center rounded-full bg-primary font-heading text-2xl"
            aria-hidden="true">{{ initials }}</span>
          <div class="min-w-0 w-full space-y-2">
            <h2 class="break-words text-2xl">{{ account.name }}</h2>
            <p class="inline-flex rounded-full bg-primary/40 px-3 py-1 text-xs text-muted-foreground">reader account</p>
          </div>
        </header>
        <dl class="space-y-1">
          <dt class="text-xs text-muted-foreground">Sign-in email</dt>
          <dd class="[overflow-wrap:anywhere]">{{ account.email }}</dd>
        </dl>
        <div class="mx-auto w-full max-w-xs pt-1">
          <CustomerProfileDialog :account="account" @saved="updateDetails" />
        </div>
      </article>
    </div>
  </AppPage>
</template>
