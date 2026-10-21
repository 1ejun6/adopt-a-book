<script setup>
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

        toast.success(response.message);
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
    <section class="mx-auto w-full max-w-md content-center">
        <div class="carddupe">
            <h1>Login</h1>
            <p>welcome back!!</p>
            <form @submit.prevent="login">
                <Field>
                    <FieldLabel for="email">Email</FieldLabel>
                    <Input id="email" v-model="form.email" type="email" autocomplete="email"
                        placeholder="enter your email" class="h-11" required />
                </Field>
                <Field>
                    <FieldLabel for="password">Password</FieldLabel>
                    <Input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'"
                        autocomplete="current-password" placeholder="enter your password" required />
                </Field>
                <label class="flex items-center gap-2.5">
                    <Checkbox v-model="showPassword" /> show password
                </label>
                <Button type="submit" class="w-full" :disabled="form.loading">{{ form.loading ? 'Logging in…' : 'Login'
                    }}</Button>
            </form>
        </div>
    </section>
</template>
