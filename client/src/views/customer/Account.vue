<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { LockKeyIcon, UserIcon } from '@hugeicons/core-free-icons';
import { toast } from 'vue-sonner';
import AppPage from '@/components/shared/AppPage.vue';
import { Button } from '@/components/ui/button';
import AppPasswordInput from '@/components/shared/AppPasswordInput.vue';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import GenrePicker from '@/components/customer/GenrePicker.vue';
const auth = useAuthStore();
const preferredgenres = ref([]), savingPreferences = ref(false), preferencesError = ref('');
const preferencesChanged = computed(() => JSON.stringify([...preferredgenres.value].sort()) !== JSON.stringify([...(account.value?.preferredgenres || [])].sort()));

const account = ref(null), loading = ref(true), loadError = ref('');
const activePanel = ref('profile');
const draft = reactive({ name: '', email: '' });
const passwords = reactive({ password: '', confirmation: '' });
const savingProfile = ref(false), savingPassword = ref(false);
const profileError = ref(''), passwordError = ref('');
const profileSaved = ref(false), passwordSaved = ref(false);
const emailTouched = ref(false), confirmationTouched = ref(false);
const profileErrorElement = ref(null), passwordErrorElement = ref(null);
const profileTab = ref(null), passwordTab = ref(null);
const initials = computed(() => account.value?.name?.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'R');
const changed = computed(() => account.value && (draft.name.trim() !== account.value.name || draft.email.trim().toLowerCase() !== account.value.email));
const emailInvalid = computed(() => emailTouched.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()));
const mismatch = computed(() => confirmationTouched.value && passwords.password !== passwords.confirmation);
const canSaveProfile = computed(() => changed.value && draft.name.trim() && draft.email.trim() && !savingProfile.value);
const canSavePassword = computed(() => passwords.password.length >= 8 && !!passwords.password.trim() && passwords.password === passwords.confirmation && !savingPassword.value);
let controller;
let requestId = 0;
const saveControllers = new Set();

async function loadAccount() {
  controller?.abort();
  const id = ++requestId;
  const request = new AbortController();
  controller = request;
  loading.value = true;
  loadError.value = '';
  try {
    const response = await api('/customer/profile', { method: 'GET', signal: request.signal });
    if (id !== requestId || request.signal.aborted) return;
    if (!response.account) throw new Error('could not load your account > please try again');
    account.value = response.account;
    preferredgenres.value = [...(response.account.preferredgenres || [])];
    Object.assign(draft, { name: response.account.name, email: response.account.email });
  } catch (error) {
    if (id !== requestId || request.signal.aborted) return;
    loadError.value = error.message;
  } finally { if (id === requestId) loading.value = false; }
}

watch(draft, () => { profileError.value = ''; profileSaved.value = false; });
watch(passwords, () => { passwordError.value = ''; passwordSaved.value = false; });

async function saveProfile() {
  if (!canSaveProfile.value) { return; }
  const details = { name: draft.name.trim(), email: draft.email.trim().toLowerCase() };
  const request = new AbortController();
  saveControllers.add(request);
  savingProfile.value = true;
  profileError.value = '';
  try {
    await api('/customer/profile', { method: 'PATCH', body: details, signal: request.signal });
    if (request.signal.aborted) { return; }
    account.value = { ...account.value, ...details };
    if (auth.user) { auth.updateUser(details); }
    Object.assign(draft, details);
    await nextTick();
    profileSaved.value = true;
    toast.success('Profile saved');
  } catch (error) {
    if (request.signal.aborted) { return; }
    profileError.value = error.message;
    await nextTick();
    profileErrorElement.value?.focus();
  } finally {
    savingProfile.value = false;
    saveControllers.delete(request);
  }
}

async function savePreferences() {
  if (savingPreferences.value || !preferredgenres.value.length || !preferencesChanged.value) return;
  const request = new AbortController();
  saveControllers.add(request);
  savingPreferences.value = true;
  preferencesError.value = '';
  try {
    const response = await api('/customer/preferences', {
      method: 'PATCH', body: { preferredgenres: preferredgenres.value }, signal: request.signal,
    });
    if (request.signal.aborted) return;
    account.value.preferredgenres = response.preferredgenres;
    preferredgenres.value = [...response.preferredgenres];
    toast.success('Favourite genres saved');
  } catch (error) {
    if (!request.signal.aborted) preferencesError.value = error.message;
  } finally {
    savingPreferences.value = false;
    saveControllers.delete(request);
  }
}

async function savePassword() {
  if (!canSavePassword.value) { return; }
  const request = new AbortController();
  saveControllers.add(request);
  savingPassword.value = true;
  passwordError.value = '';
  try {
    await api('/customer/password', { method: 'PATCH', body: { password: passwords.password }, signal: request.signal });
    if (request.signal.aborted) { return; }
    Object.assign(passwords, { password: '', confirmation: '' });
    confirmationTouched.value = false;
    await nextTick();
    passwordSaved.value = true;
    toast.success('Password updated');
  } catch (error) {
    if (request.signal.aborted) { return; }
    passwordError.value = error.message;
    await nextTick();
    passwordErrorElement.value?.focus();
  } finally {
    savingPassword.value = false;
    saveControllers.delete(request);
  }
}

function navigateTabs(event) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) { return; }
  event.preventDefault();
  activePanel.value = event.key === 'Home' ? 'profile' : event.key === 'End' ? 'password' : activePanel.value === 'profile' ? 'password' : 'profile';
  (activePanel.value === 'profile' ? profileTab.value : passwordTab.value)?.focus();
}

onMounted(loadAccount);
onBeforeUnmount(() => { requestId++; controller?.abort(); for (const request of saveControllers) request.abort(); });
</script>

<template>
  <AppPage aria-labelledby="account-title">
    <header class="account-heading">
      <h1 id="account-title">My account</h1>
      <p>Profile and sign-in settings</p>
    </header>

    <div v-if="loading" class="loading-state" role="status" aria-busy="true">
      <span class="sr-only">Loading your account</span>
      <Skeleton class="h-12 w-48" />
      <Skeleton class="h-72 w-full" />
    </div>
    <div v-else-if="loadError" class="error-state" role="alert">
      <h2>We couldn’t load your details</h2>
      <p>{{ loadError }}</p>
      <Button @click="loadAccount">Try again</Button>
    </div>
    <div v-else-if="account" class="account-workspace">
      <aside class="account-rail" aria-label="Account navigation">
        <div class="identity">
          <span class="avatar" aria-hidden="true">{{ initials }}</span>
          <div class="identity-details">
            <p class="identity-name">{{ account.name }}</p>
            <p class="identity-email">{{ account.email }}</p>
          </div>
        </div>
        <div class="section-nav" role="tablist" aria-orientation="vertical" aria-label="Account sections" @keydown="navigateTabs">
          <button id="profile-tab" ref="profileTab" type="button" role="tab" :data-active="activePanel === 'profile' ? true : undefined" :aria-selected="activePanel === 'profile'" aria-controls="profile-panel" :tabindex="activePanel === 'profile' ? 0 : -1" @click="activePanel = 'profile'">
            <HugeiconsIcon :icon="UserIcon" class="size-4" aria-hidden="true" />
            Profile
          </button>
          <button id="password-tab" ref="passwordTab" type="button" role="tab" :data-active="activePanel === 'password' ? true : undefined" :aria-selected="activePanel === 'password'" aria-controls="password-panel" :tabindex="activePanel === 'password' ? 0 : -1" @click="activePanel = 'password'">
            <HugeiconsIcon :icon="LockKeyIcon" class="size-4" aria-hidden="true" />
            Password
          </button>
        </div>
      </aside>

      <div class="account-content">
        <section v-show="activePanel === 'profile'" id="profile-panel" role="tabpanel" aria-labelledby="profile-tab" tabindex="0">
          <header class="panel-heading">
            <div class="panel-title">
              <span class="section-icon"><HugeiconsIcon :icon="UserIcon" class="size-4" aria-hidden="true" /></span>
              <h2>Profile</h2>
            </div>
            <p>your name &amp; the email you use to sign in</p>
          </header>
          <form :aria-busy="savingProfile" @submit.prevent="saveProfile">
            <p v-if="profileError" ref="profileErrorElement" class="form-error" role="alert" tabindex="-1">
              {{ profileError }}
            </p>
            <div class="account-field">
              <label for="account-name">Full name</label>
              <Input id="account-name" v-model="draft.name" autocomplete="name" maxlength="100" required :disabled="savingProfile" />
            </div>
            <div class="account-field">
              <label for="account-email">Email address</label>
              <Input id="account-email" v-model="draft.email" type="email" autocomplete="email" maxlength="200" required :disabled="savingProfile" :aria-invalid="emailInvalid || undefined" aria-describedby="account-email-help" @blur="emailTouched = true" />
              <p id="account-email-help" class="field-note" :class="{ 'invalid-note': emailInvalid }">
                {{ emailInvalid ? 'Enter a valid email address.' : 'Use this email to sign in.' }}
              </p>
            </div>
            <footer class="form-footer">
              <p role="status" :class="{ saved: profileSaved }">
                {{ savingProfile ? 'Saving your details…' : profileSaved ? 'Profile saved' : changed ? 'You have unsaved changes' : 'No unsaved changes' }}
              </p>
              <Button type="submit" :disabled="!canSaveProfile">
                {{ savingProfile ? 'Updating…' : 'Update' }}
              </Button>
            </footer>
          </form>
          <form id="preferences" :aria-busy="savingPreferences" @submit.prevent="savePreferences">
            <GenrePicker v-model="preferredgenres" :disabled="savingPreferences" />
            <p v-if="preferencesError" role="alert" class="form-error">{{ preferencesError }}</p>
            <p v-if="!preferredgenres.length" class="field-note">Choose at least one genre to save your preferences.</p>
            <Button type="submit" :disabled="savingPreferences || !preferredgenres.length || !preferencesChanged">
              {{ savingPreferences ? 'Saving…' : 'Save genres' }}
            </Button>
          </form>
        </section>

        <section v-show="activePanel === 'password'" id="password-panel" role="tabpanel" aria-labelledby="password-tab" tabindex="0">
          <header class="panel-heading">
            <div class="panel-title">
              <span class="section-icon"><HugeiconsIcon :icon="LockKeyIcon" class="size-4" aria-hidden="true" /></span>
              <h2>Change password</h2>
            </div>
            <p>Use at least 8 characters.</p>
          </header>
          <form :aria-busy="savingPassword" @submit.prevent="savePassword">
            <p v-if="passwordError" ref="passwordErrorElement" class="form-error" role="alert" tabindex="-1">
              {{ passwordError }}
            </p>
            <div class="account-field">
              <label for="account-new-password">New password</label>
              <AppPasswordInput label="new password" id="account-new-password" v-model="passwords.password"  autocomplete="new-password" minlength="8" required :spellcheck="false" autocapitalize="none" :disabled="savingPassword" aria-describedby="password-hint" />
              <p id="password-hint" class="field-note">Use at least 8 characters.</p>
            </div>
            <div class="account-field">
              <label for="account-confirm-password">Confirm new password</label>
              <AppPasswordInput label="confirmation password" id="account-confirm-password" v-model="passwords.confirmation"  autocomplete="new-password" required :spellcheck="false" autocapitalize="none" :disabled="savingPassword" :aria-invalid="mismatch || undefined" aria-describedby="password-feedback" @blur="confirmationTouched = true" />
              <p id="password-feedback" class="field-note" :class="{ 'invalid-note': mismatch }" aria-live="polite">
                {{ mismatch ? 'Passwords don’t match.' : passwords.confirmation && canSavePassword ? 'Passwords match.' : '' }}
              </p>
            </div>
            <footer class="form-footer">
              <p role="status" :class="{ saved: passwordSaved }">
                {{ savingPassword ? 'Updating your password…' : passwordSaved ? 'Password updated' : canSavePassword ? 'Ready to update your password' : 'Enter and confirm a new password' }}
              </p>
              <Button type="submit" :disabled="!canSavePassword">
                {{ savingPassword ? 'Updating…' : 'Update' }}
              </Button>
            </footer>
          </form>
        </section>
      </div>
    </div>
  </AppPage>
</template>

<style scoped src="@/assets/account.css"></style>
