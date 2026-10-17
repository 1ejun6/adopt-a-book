<script setup>
import { watch } from 'vue'

const props = defineProps({
    message: { type: String, required: true },
    variant: { type: String, default: 'success' },
    items: { type: Array, default: () => [] },
});
const emit = defineEmits(['dismiss']);

watch(() => [props.message, props.variant], (_, previous, onCleanup) => {
    if (props.variant !== 'success' || !props.message) return;
    const timer = setTimeout(() => emit('dismiss'), 5000);
    onCleanup(() => clearTimeout(timer));
}, { immediate: true });
</script>

<template>
    <div class="space-y-2 rounded-lg border p-2.5 text-sm"
        :class="variant === 'error' ? 'border-badge-rose-foreground/20 bg-badge-rose text-badge-rose-foreground' : 'border-success-border bg-success text-success-foreground'"
        :role="variant === 'error' ? 'alert' : 'status'">
        <strong>{{ message }}</strong>
        <ol v-if="items.length" class="list-decimal pl-5">
            <li v-for="(item, index) in items" :key="index">{{ item }}</li>
        </ol>
    </div>
</template>
