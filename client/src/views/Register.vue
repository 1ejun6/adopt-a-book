<script setup>
import AppPage from '@/components/shared/AppPage.vue';
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'vue-sonner'

const router = useRouter();
const showPassword = ref(false);
const form = reactive({ name: '', email: '', password: '', loading: false });

async function register() {
    if (form.loading) { return; }
    form.loading = true;

    try {
        const data = {
            method: 'POST',
            body: { name: form.name.trim(), email: form.email.trim(), password: form.password }
        };

        await api('/register', data);
        toast.success('account created > log in to continue');
        form.password = '';

        await router.push('/login');
    } catch (error) {
        toast.error(error.message);
    } finally {
        form.loading = false;
    }
}
</script>
<template>
    <AppPage aria-labelledby="register-title">
        <div class="mx-auto w-full max-w-md space-y-8">
            <header class="space-y-2 text-center">
                <h1 id="register-title" class="text-4xl">Create Your Account</h1>
                <p class="text-sm text-muted-foreground">join us!!</p>
            </header>
            <form @submit.prevent="register">
                <Field>
                    <FieldLabel for="name">Name</FieldLabel>
                    <Input id="name" v-model="form.name" type="text" autocomplete="name" placeholder="enter your name" class="h-11" required />
                </Field>
                <Field>
                    <FieldLabel for="email">Email</FieldLabel>
                    <Input id="email" v-model="form.email" type="email" autocomplete="email" placeholder="enter your email" class="h-11" required />
                </Field>
                <Field>
                    <FieldLabel for="password">Password</FieldLabel>
                    <Input id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="create a password" class="h-11" required />
                </Field>
                <label class="flex min-h-11 items-center gap-2.5">
                    <Checkbox v-model="showPassword" /> show password
                </label>
                <Button type="submit" class="min-h-11 w-full" :disabled="form.loading">{{ form.loading ? 'Registering…' : 'Register' }}</Button>
            </form>
        </div>
    </AppPage>
</template>
