<script setup>
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
</script>
<template>
    <section class="mx-auto w-full max-w-md content-center">
        <div class="carddupe">
            <h1>Create Your Account</h1>
            <p>join us!!</p>
            <form> <!--j > adds equal vertical space between each thing inside form-->
                <Field>
                    <FieldLabel for="name">Name</FieldLabel>
                    <Input id="name" type="name" required />
                </Field>
                <Field>
                    <FieldLabel for="email">Email</FieldLabel>
                    <Input id="email" type="email" required />
                </Field>
                <Field>
                    <FieldLabel for="password">Password</FieldLabel>
                    <Input id="password" type="password" required />
                </Field>
                <Button type="submit">Register</Button>
            </form>
        </div>
    </section>
</template>