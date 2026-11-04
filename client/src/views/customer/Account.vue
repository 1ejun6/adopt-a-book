<script setup>
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
  <section class="mx-auto w-full max-w-3xl space-y-6">
    <header class="space-y-2">
      <h1 class="sm:text-4xl">My account</h1>
      <p class="text-muted-foreground text-sm">your details, in one place</p>
    </header>

    <div v-if="loading" class="space-y-6 rounded-xl border bg-card p-5" role="status" aria-busy="true">
      <span class="sr-only">Loading your account</span>
      <div class="flex items-center gap-4">
        <Skeleton class="size-16 rounded-full" />
        <Skeleton class="h-7 w-40" />
      </div>
      <Skeleton class="h-24 w-full" />
    </div>
    <div v-else-if="loadError" class="space-y-4 rounded-xl border bg-card p-5" role="alert">
      <h2 class="text-xl">We couldn’t load your details</h2>
      <p class="text-sm">{{ loadError }}</p>
      <Button variant="outline" @click="loadAccount">Try again</Button>
    </div>
    <article v-else-if="account" class="washi-tape rounded-xl border bg-card" data-active>
      <header class="flex flex-wrap items-center gap-4 border-b p-5">
        <span class="grid size-16 shrink-0 place-items-center rounded-full border bg-background font-heading text-2xl"
          aria-hidden="true">{{ initials }}</span>
        <div class="min-w-0 flex-1">
          <h2 class="break-words sm:text-3xl">{{ account.name }}</h2>
          <p class="text-sm text-muted-foreground">reader account</p>
        </div>
        <CustomerProfileDialog :account="account" @saved="updateDetails" />
      </header>
      <div class="grid gap-6 p-5 sm:grid-cols-2">
        <section class="space-y-4">
          <h3>Personal details</h3>
          <dl class="space-y-1">
            <dt class="text-sm text-muted-foreground">Full name</dt>
            <dd class="break-words">{{ account.name }}</dd>
          </dl>
        </section>
        <section class="space-y-4">
          <h3>Contact details</h3>
          <dl class="space-y-1">
            <dt class="text-sm text-muted-foreground">Email address</dt>
            <dd class="break-all">{{ account.email }}</dd>
          </dl>
        </section>
      </div>
    </article>

  </section>
</template>
