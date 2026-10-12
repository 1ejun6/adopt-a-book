<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { auth } from '@/lib/auth'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const router = useRouter();
const showPassword = ref(false);
const form = reactive({ email: '', password: '', loading: false });

async function login() {
    if (form.loading) {
        return;
    }

    form.loading = true;

    try {
        const data = {
            method: 'POST',
            body: { email: form.email.trim(), password: form.password }
        };
        const response = await api('/login', data);

        auth.user = response.user;
        auth.ready = true;

        console.log(response.message || 'login successful');
        form.password = '';
        await router.push('/');
    } catch (error) {
        console.error(error.message);
    } finally {
        form.loading = false;
    }
}
</script>
<template>
    <section class="mx-auto w-full max-w-md content-center">
        <div class="carddupe">
            <h1>Login</h1>
            <p>welcome back!!</p>
            <form @submit.prevent="login">
                <Field>
                    <FieldLabel for="email">Email</FieldLabel>
                    <Input id="email" v-model="form.email" type="email" autocomplete="email"
                        placeholder="Enter your email" class="h-11" required />
                </Field>
                <Field>
                    <FieldLabel for="password">Password</FieldLabel>
                    <Input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'"
                        autocomplete="current-password" placeholder="Enter your password" required />
                </Field>
                <label class="block">
                    <input type="checkbox" v-model="showPassword" /> show password
                </label>
                <Button type="submit" class="w-full" :disabled="form.loading">{{ form.loading ? 'Logging in…' : 'Login'
                    }}</Button>
            </form>
        </div>
    </section>
</template>
