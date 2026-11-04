<script setup>
import AppPage from '@/components/shared/AppPage.vue';
import { toast } from 'vue-sonner';
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { auth, homeRoute } from '@/lib/auth'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import AppPasswordInput from '@/components/shared/AppPasswordInput.vue';

const router = useRouter();
const form = reactive({ email: '', password: '', loading: false });

async function login() {
    if (form.loading) { return; }

    form.loading = true;

    try {
        const data = {
            method: 'POST',
            body: { email: form.email.trim(), password: form.password }
        };

        const response = await api('/login', data);
        auth.user = response.user;
        auth.ready = true;

        toast.success('logged in');
        form.password = '';

        await router.push(homeRoute.value);
    } catch (error) {
        toast.error(error.message);
    } finally {
        form.loading = false;
    }
}
</script>
<template>
    <AppPage aria-labelledby="login-title">
        <div class="mx-auto w-full max-w-md space-y-8">
            <header class="space-y-2 text-center">
                <h1 id="login-title" class="text-4xl">Login</h1>
                <p class="text-sm text-muted-foreground">welcome back!!</p>
            </header>
            <form @submit.prevent="login">
                <Field>
                    <FieldLabel for="email">Email</FieldLabel>
                    <Input id="email" v-model="form.email" type="email" autocomplete="email"
                        placeholder="enter your email"  required />
                </Field>
                <Field>
                    <FieldLabel for="password">Password</FieldLabel>
                    <AppPasswordInput id="password" v-model="form.password" autocomplete="current-password"
                        placeholder="enter your password"  required :disabled="form.loading" />
                </Field>
                <Button type="submit" class="w-full" :disabled="form.loading">{{ form.loading ? 'Logging in…' : 'Login'
                    }}</Button>
            </form>
        </div>
    </AppPage>
</template>
