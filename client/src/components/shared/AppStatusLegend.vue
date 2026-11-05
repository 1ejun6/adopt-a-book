<script setup>
import StatusBadge from '@/components/shared/AppStatusBadge.vue';

defineProps({
    statuses: { type: Array, required: true }
});
</script>

<template>
    <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" role="group" aria-label="Status colour legend">
        <span class="text-muted-foreground">status legend</span>
        <slot v-for="status in statuses" :key="status.value" name="item" :status="status">
            <StatusBadge :status="status.value" :tone="status.tone">{{ status.label }}</StatusBadge>
        </slot>
    </div>
</template>
