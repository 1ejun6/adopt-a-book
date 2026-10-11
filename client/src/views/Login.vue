<script setup>
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
</script>
<template>
    <section class="mx-auto w-full max-w-md content-center">
        <div class="carddupe">
            <h1>Login</h1>
            <p>welcome back!!</p>
            <form> <!--j > adds equal vertical space between each thing inside form-->
                <Field>
                    <FieldLabel for="email">Email</FieldLabel>
                    <Input id="email" type="email" required />
                </Field>
                <Field>
                    <FieldLabel for="password">Password</FieldLabel>
                    <Input id="password" type="password" required />
                </Field>
                <p class="text-sm">show password</p>
                <Button type="submit" class="w-full">Login</Button>
            </form>
        </div>
    </section>
</template>
