<script setup>
import { toast } from 'vue-sonner';
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { loginDestination } from '@/router';
import { useAuthStore } from '@/stores/auth';
const auth = useAuthStore();
const route = useRoute();
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const router = useRouter();
const showPassword = ref(false);
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
      <p>welcome back!!</p>
      <form @submit.prevent="login">
        <Field>
          <FieldLabel for="email">Email</FieldLabel>
          <Input id="email" v-model="form.email" type="email" autocomplete="email" placeholder="enter your email" class="md:text-base min-h-11" required />
        </Field>
        <Field>
          <FieldLabel for="password">Password</FieldLabel>
          <Input class="md:text-base min-h-11" id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" placeholder="enter your password" required />
        </Field>
        <label class="flex min-h-11 items-center gap-2.5"> <Checkbox v-model="showPassword" /> show password </label>
        <Button type="submit" class="w-full min-h-11" :disabled="auth.loginLoading">{{ auth.loginLoading ? 'Logging in…' : 'Login' }}</Button>
      </form>
    </div>
  </section>
</template>
