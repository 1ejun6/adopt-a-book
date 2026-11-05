<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { api } from '@/lib/api';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import AppPasswordInput from '@/components/shared/AppPasswordInput.vue';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const props = defineProps({ account: { type: Object, required: true } });
const emit = defineEmits(['saved']);
const open = ref(false);
const saving = ref(false);
const error = ref('');
const errorMessage = ref(null);
const draft = reactive({ name: '', email: '' });
const passwords = reactive({ password: '', confirmation: '' });
const passwordExpanded = ref(false);
const confirmationTouched = ref(false);
const mismatch = computed(() => confirmationTouched.value && passwords.password !== passwords.confirmation);
const passwordChanged = computed(() => !!passwords.password || !!passwords.confirmation);
const changed = computed(() => draft.name.trim() !== props.account.name || draft.email.trim().toLowerCase() !== props.account.email);
const canSave = computed(() => !saving.value && (changed.value || passwordChanged.value)
  && !!draft.name.trim() && !!draft.email.trim()
  && (!passwordChanged.value || (!!passwords.password.trim() && passwords.password === passwords.confirmation)));
watch(error, async value => {
  if (value) {
    await nextTick();
    errorMessage.value?.focus();
  }
});
watch(open, value => {
  if (value) Object.assign(draft, { name: props.account.name, email: props.account.email });
  error.value = '';
  Object.assign(passwords, { password: '', confirmation: '' });
  passwordExpanded.value = false;
  confirmationTouched.value = false;
});
watch(draft, () => { error.value = ''; });
watch(passwords, () => { error.value = ''; });

async function saveDetails() {
  if (!canSave.value) return;
  const details = { name: draft.name.trim(), email: draft.email.trim().toLowerCase() };
  if (!details.name) { error.value = 'Please enter your name.'; return; }
  if (passwordChanged.value) {
    passwordExpanded.value = true;
    if (!passwords.password.trim()) { error.value = 'Please enter a new password or clear both password fields.'; return; }
    if (passwords.password !== passwords.confirmation) { confirmationTouched.value = true; return; }
  }
  saving.value = true;
  error.value = '';
  try {
    const endpoint = changed.value ? '/customer/profile' : '/customer/password';
    const body = changed.value ? { ...details } : {};
    if (passwordChanged.value) body.password = passwords.password;
    await api(endpoint, { method: 'PATCH', body });
    emit('saved', details);
    open.value = false;
    toast.success(passwordChanged.value ? (changed.value ? 'account and password updated' : 'password updated') : 'account details updated');
  } catch (failure) {
    error.value = failure.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="value => { if (!saving) open = value; }">
    <DialogTrigger asChild><Button><AppIcon name="edit" /><span class="sr-only">Edit profile</span></Button></DialogTrigger>
    <DialogContent class="max-w-md sm:max-w-2xl lg:max-w-3xl border" :showCloseButton="!saving"
      @escapeKeyDown="event => { if (saving) event.preventDefault(); }"
      @interactOutside="event => { if (saving) event.preventDefault(); }">
      <DialogHeader class="space-y-1 border-0 pb-0">
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>your name, sign-in email and password</DialogDescription>
      </DialogHeader>
      <form class="p-5" :aria-busy="saving" @submit.prevent="saveDetails">
        <p v-if="error" ref="errorMessage" class="rounded-lg bg-badge-purple p-3 text-destructive" role="alert" tabindex="-1">{{ error }}</p>
        <div class="space-y-4">
          <Field>
            <FieldLabel for="account-name">Full name</FieldLabel>
            <Input id="account-name" v-model="draft.name" autocomplete="name" maxlength="100"  required :disabled="saving" />
          </Field>
          <Field>
            <FieldLabel for="account-email">Email address</FieldLabel>
            <Input id="account-email" v-model="draft.email" type="email" autocomplete="email" maxlength="200"
              required :disabled="saving" />
          </Field>
        </div>
        <section class="space-y-4">
          <button type="button" class="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg bg-primary/40 px-3 py-3 text-left"
            :aria-expanded="passwordExpanded" aria-controls="account-password-fields" :disabled="saving"
            @click="passwordExpanded = !passwordExpanded">
            <span class="space-y-1">
              <span class="block font-medium">Change password</span>
              <span class="block text-sm text-muted-foreground">{{ passwordChanged ? 'Password change added' : 'Optional · keep your current password' }}</span>
            </span>
            <span aria-hidden="true" class="text-xl">{{ passwordExpanded ? '−' : '+' }}</span>
          </button>
          <div v-show="passwordExpanded" id="account-password-fields" class="space-y-4">
            <Field>
              <FieldLabel for="account-new-password">New password</FieldLabel>
              <AppPasswordInput label="new password" id="account-new-password" v-model="passwords.password"
                 autocomplete="new-password" :spellcheck="false" autocapitalize="none" :disabled="saving" />
            </Field>
            <Field>
              <FieldLabel for="account-confirm-password">Confirm new password</FieldLabel>
              <AppPasswordInput label="confirmation password" id="account-confirm-password" v-model="passwords.confirmation"
                 autocomplete="new-password" :spellcheck="false" autocapitalize="none" :disabled="saving"
                :aria-invalid="mismatch || undefined" :aria-describedby="mismatch ? 'account-password-mismatch' : undefined"
                @blur="confirmationTouched = true" />
              <p v-if="mismatch" id="account-password-mismatch" class="text-destructive" role="alert">Passwords do not match.</p>
            </Field>
          </div>
        </section>
        <div class="space-y-2 pt-1">
          <Button type="submit" class="w-full" :disabled="!canSave" :loading="saving">
            {{ saving ? 'saving…' : 'save' }}
          </Button>
          <p class="text-center text-sm text-muted-foreground" role="status">
            {{ saving ? 'Updating your account…' : changed || passwordChanged ? 'Changes ready to save' : 'No changes yet' }}
          </p>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
