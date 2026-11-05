<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'vue-sonner'

import GenrePicker from '@/components/customer/GenrePicker.vue';

const router = useRouter();
const showPassword = ref(false);
const form = reactive({ name: '', email: '', password: '', preferredgenres: [], loading: false });

async function register() {
    if (form.loading) { return; }
    if (!form.preferredgenres.length) { toast.error("Choose at least one favourite genre"); return; }
    form.loading = true;

    try {
        const data = {
            method: 'POST',
            body: { name: form.name.trim(), email: form.email.trim(), password: form.password, preferredgenres: form.preferredgenres }
        };

        const response = await api('/register', data);
        toast.success(response.message);
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
    <section class="mx-auto w-full max-w-md py-5">
        <div class="space-y-5">
            <h1>Create Your Account</h1>
            <p>join us!!</p>
            <form @submit.prevent="register">
                <Field>
                    <FieldLabel for="name">Name</FieldLabel>
                    <Input class="md:text-base min-h-11" id="name" v-model="form.name" type="text" autocomplete="name" placeholder="enter your name" required />
                </Field>
                <Field>
                    <FieldLabel for="email">Email</FieldLabel>
                    <Input class="md:text-base min-h-11" id="email" v-model="form.email" type="email" autocomplete="email" placeholder="enter your email" required />
                </Field>
                <Field>
                    <FieldLabel for="password">Password</FieldLabel>
                    <Input class="md:text-base min-h-11" id="password" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" placeholder="create a password" required />
                </Field>
                <label class="flex min-h-11 items-center gap-2.5">
                    <Checkbox v-model="showPassword" /> show password
                </label>
                <GenrePicker v-model="form.preferredgenres" :disabled="form.loading" />
                <Button type="submit" class="w-full min-h-11" :disabled="form.loading">{{ form.loading ? 'Registering…' : 'Register' }}</Button>
            </form>
        </div>
    </section>
</template>
