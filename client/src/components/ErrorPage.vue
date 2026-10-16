<script setup>
import { Button } from '@/components/ui/button'

const props = defineProps({
    title: { type: String, default: 'Something went wrong' },
    message: { type: String, required: true },
});
const emit = defineEmits(['retry']);
</script>
<template>
    <section role="alert" class="carddupe text-center">
        <h2>{{ props.title }}</h2>
        <p>{{ props.message }}</p>
        <Button type="button" variant="outline" @click="emit('retry')">Retry</Button>
    </section>
</template>
