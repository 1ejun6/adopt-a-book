<script setup>
import AppPage from '@/components/shared/AppPage.vue';
import { toast } from 'vue-sonner';
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { auth, homeRoute } from '@/lib/auth'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

const router = useRouter();
const showPassword = ref(false);
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
                        placeholder="enter your email" class="h-11" required />
                </Field>
                <Field>
                    <FieldLabel for="password">Password</FieldLabel>
                    <Input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'"
                        autocomplete="current-password" placeholder="enter your password" class="h-11" required />
                </Field>
                <label class="flex min-h-11 items-center gap-2.5">
                    <Checkbox v-model="showPassword" /> show password
                </label>
                <Button type="submit" class="min-h-11 w-full" :disabled="form.loading">{{ form.loading ? 'Logging in…' : 'Login'
                    }}</Button>
            </form>
        </div>
    </AppPage>
</template>
