<script setup>
import { toast } from 'vue-sonner';
import { reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { loginDestination } from '@/router';
import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();
const route = useRoute();
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AppPasswordInput from '@/components/shared/AppPasswordInput.vue';

const router = useRouter();
const fieldErrors = reactive({});
function fieldFeedback(event) { fieldErrors[event.target.id] = event.target.validationMessage || ''; }
const form = reactive({ email: '', password: '' });

async function login() {
  if (auth.loginLoading) { return; }

  try {
    const response = await auth.login({ email: form.email.trim(), password: form.password });
    toast.success(response.message);
    form.password = '';

    await router.replace(loginDestination(route.query.redirect, auth));
  } catch (error) {
    toast.error(error.message);
  }
}
</script>
<template>
  <section class="mx-auto w-full max-w-md py-5">
    <div class="space-y-5">
      <h1>Login</h1>
      <form @submit.prevent="login">
        <p v-if="auth.error" role="alert" class="text-destructive">{{ auth.error }}</p>
        <fieldset :disabled="auth.loginLoading" class="space-y-4">
        <Field>
          <FieldLabel for="email">Email</FieldLabel>
          <Input id="email" @blur="fieldFeedback" @invalid="fieldFeedback" @input="fieldFeedback" :aria-invalid="!!fieldErrors.email || undefined" :aria-describedby="fieldErrors.email ? 'email-feedback' : undefined" v-model="form.email" type="email" autocomplete="email" placeholder="you@example.com" required />
        <p v-if="fieldErrors.email" id="email-feedback" class="text-sm text-destructive" role="alert">{{ fieldErrors.email }}</p>
                </Field>
        <Field>
          <FieldLabel for="password">Password</FieldLabel>
          <AppPasswordInput id="password" @blur="fieldFeedback" @invalid="fieldFeedback" @input="fieldFeedback" :aria-invalid="!!fieldErrors.password || undefined" :aria-describedby="fieldErrors.password ? 'password-feedback' : undefined" :disabled="auth.loginLoading" v-model="form.password"  autocomplete="current-password"  required />
        <p v-if="fieldErrors.password" id="password-feedback" class="text-sm text-destructive" role="alert">{{ fieldErrors.password }}</p>
                </Field>
        <Button type="submit" class="w-full " :disabled="auth.loginLoading">{{ auth.loginLoading ? 'Signing in…' : 'Login' }}</Button>
        </fieldset>
      </form>
      <RouterLink class="underline" :to="{ name: 'register', query: { redirect: route.query.redirect } }">Create an account</RouterLink>
    </div>
  </section>
</template>
