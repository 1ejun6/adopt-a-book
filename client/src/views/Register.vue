<script setup>
import { nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import AppPasswordInput from '@/components/shared/AppPasswordInput.vue'
import { toast } from 'vue-sonner'

import GenrePicker from '@/components/customer/GenrePicker.vue';

const router = useRouter();
const route = useRoute();
const errorMessage = ref('');
const genreError = ref('');
const genrePicker = ref(null);
const fieldErrors = reactive({});
function fieldFeedback(event) { fieldErrors[event.target.id] = event.target.validationMessage || ''; }
const form = reactive({ name: '', email: '', password: '', preferredgenres: [], loading: false });
watch(() => form.preferredgenres.length, length => { if (length) genreError.value = ''; });

async function register() {
    if (form.loading) { return; }
    errorMessage.value = "";
    if (!form.preferredgenres.length) {
        genreError.value = 'Choose at least one favourite genre to create your account.';
        await nextTick();
        genrePicker.value?.focus();
        return;
    }
    form.loading = true;

    try {
        const data = {
            method: 'POST',
            body: { name: form.name.trim(), email: form.email.trim(), password: form.password, preferredgenres: form.preferredgenres }
        };

        const response = await api('/register', data);
        toast.success(response.message);
        form.password = '';

        await router.push({ name: 'login', query: { redirect: route.query.redirect } });
    } catch (error) {
        errorMessage.value = error.message;
        toast.error(error.message);
    } finally {
        form.loading = false;
    }
}
</script>
<template>
    <section class="m-auto w-full max-w-md py-5 md:max-w-5xl md:py-8">
        <div class="space-y-5">
            <h1>Create account</h1>
            <form @submit.prevent="register">
                <p v-if="errorMessage" role="alert" class="text-destructive">{{ errorMessage }}</p>
                <fieldset :disabled="form.loading" class="grid items-start gap-6 md:grid-cols-2 md:gap-x-12">
                <div class="min-w-0 space-y-4">
                <Field>
                    <FieldLabel for="name">Name</FieldLabel>
                    <Input id="name" @blur="fieldFeedback" @invalid="fieldFeedback" @input="fieldFeedback" :aria-invalid="!!fieldErrors.name || undefined" :aria-describedby="fieldErrors.name ? 'name-feedback' : undefined" v-model="form.name" type="text" autocomplete="name"  required />
                <p v-if="fieldErrors.name" id="name-feedback" class="text-sm text-destructive" role="alert">{{ fieldErrors.name }}</p>
                </Field>
                <Field>
                    <FieldLabel for="email">Email</FieldLabel>
                    <Input id="email" @blur="fieldFeedback" @invalid="fieldFeedback" @input="fieldFeedback" :aria-invalid="!!fieldErrors.email || undefined" :aria-describedby="fieldErrors.email ? 'email-feedback' : undefined" v-model="form.email" type="email" autocomplete="email" placeholder="you@example.com" required />
                <p v-if="fieldErrors.email" id="email-feedback" class="text-sm text-destructive" role="alert">{{ fieldErrors.email }}</p>
                </Field>
                <Field>
                    <FieldLabel for="password">Password</FieldLabel>
                    <AppPasswordInput id="password" @blur="fieldFeedback" @invalid="fieldFeedback" @input="fieldFeedback" :aria-invalid="!!fieldErrors.password || undefined" :aria-describedby="fieldErrors.password ? 'password-feedback' : undefined" minlength="8" :disabled="form.loading" v-model="form.password"  autocomplete="new-password"  required />
                <p v-if="fieldErrors.password" id="password-feedback" class="text-sm text-destructive" role="alert">{{ fieldErrors.password }}</p>
                </Field>
                <p class="text-sm">Use at least 8 characters.</p>
                </div>
                <GenrePicker :showCount="false" ref="genrePicker" v-model="form.preferredgenres" class="register-genres" required :error="genreError" :disabled="form.loading" />
                <div class="md:col-span-2 md:border-t md:pt-5">
                    <Button type="submit" class="w-full" :disabled="form.loading" :loading="form.loading">{{ form.loading ? 'Registering…' : 'Register' }}</Button>
                </div>
                </fieldset>
            </form>
        </div>
    </section>
</template>

<style scoped>
.register-genres { margin-block: 0; }
</style>
