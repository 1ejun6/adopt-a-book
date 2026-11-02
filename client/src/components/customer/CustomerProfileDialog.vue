<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { api } from '@/lib/api';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const props = defineProps({ account: { type: Object, required: true } });
const emit = defineEmits(['saved']);
const open = ref(false);
const saving = ref(false);
const error = ref('');
const draft = reactive({ name: '', email: '' });
const passwords = reactive({ password: '', confirmation: '' });
const showPassword = ref(false);
const passwordExpanded = ref(false);
const confirmationTouched = ref(false);
const mismatch = computed(() => confirmationTouched.value && passwords.password !== passwords.confirmation);
const passwordChanged = computed(() => !!passwords.password || !!passwords.confirmation);
const changed = computed(() => draft.name.trim() !== props.account.name || draft.email.trim().toLowerCase() !== props.account.email);
watch(open, value => {
  if (value) Object.assign(draft, { name: props.account.name, email: props.account.email });
  error.value = '';
  Object.assign(passwords, { password: '', confirmation: '' });
  showPassword.value = false;
  passwordExpanded.value = false;
  confirmationTouched.value = false;
});
watch(draft, () => { error.value = ''; });
watch(passwords, () => { error.value = ''; });

async function saveDetails() {
  if (saving.value || (!changed.value && !passwordChanged.value)) return;
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
    toast.success(passwordChanged.value ? 'account and password updated' : 'account details updated');
  } catch (failure) {
    error.value = failure.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="value => { if (!saving) open = value; }">
    <DialogTrigger asChild><Button variant="outline" class="w-full sm:w-auto">Edit</Button></DialogTrigger>
    <DialogContent class="max-w-md border" :showCloseButton="!saving">
      <DialogHeader class="border-0 pb-0">
        <DialogTitle>Edit</DialogTitle>
        <DialogDescription>update your details or choose a new password</DialogDescription>
      </DialogHeader>
      <form class="p-5" :aria-busy="saving" @submit.prevent="saveDetails">
        <p v-if="error" class="text-destructive" role="alert">{{ error }}</p>
        <Field>
          <FieldLabel for="account-name">Full name</FieldLabel>
          <Input id="account-name" v-model="draft.name" autocomplete="name" maxlength="100" required :disabled="saving" />
        </Field>
        <Field>
          <FieldLabel for="account-email">Email address</FieldLabel>
          <Input id="account-email" v-model="draft.email" type="email" autocomplete="email" maxlength="200"
            aria-describedby="account-email-help" required :disabled="saving" />
        </Field>
        <section class="space-y-4">
          <button type="button" class="flex min-h-11 w-full items-center justify-between text-left"
            :aria-expanded="passwordExpanded" aria-controls="account-password-fields" :disabled="saving"
            @click="passwordExpanded = !passwordExpanded">
            update password <span aria-hidden="true">{{ passwordExpanded ? '−' : '+' }}</span>
          </button>
          <div v-show="passwordExpanded" id="account-password-fields" class="space-y-4">
            <p class="text-xs text-muted-foreground">Leave both fields empty to keep your current password.</p>
            <Field>
              <FieldLabel for="account-new-password">New password</FieldLabel>
              <Input id="account-new-password" v-model="passwords.password" :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password" :spellcheck="false" autocapitalize="none" :disabled="saving" />
            </Field>
            <Field>
              <FieldLabel for="account-confirm-password">Confirm new password</FieldLabel>
              <Input id="account-confirm-password" v-model="passwords.confirmation" :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password" :spellcheck="false" autocapitalize="none" :disabled="saving"
                :aria-invalid="mismatch || undefined" :aria-describedby="mismatch ? 'account-password-mismatch' : undefined"
                @blur="confirmationTouched = true" />
              <p v-if="mismatch" id="account-password-mismatch" class="text-destructive" role="alert">Passwords do not match.</p>
            </Field>
            <label class="flex min-h-11 items-center gap-2.5"><Checkbox v-model="showPassword" :disabled="saving" /> Show passwords</label>
          </div>
        </section>
        <div class="flex justify-end">
          <Button type="submit" class="w-full sm:w-auto" :disabled="saving || (!changed && !passwordChanged) || !draft.name.trim() || !draft.email.trim()">
            {{ saving ? 'Saving…' : 'Save' }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
