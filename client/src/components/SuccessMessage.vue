<script setup>
import { Button } from '@/components/ui/button'

defineProps({
    message: { type: String, required: true },
    variant: { type: String, default: 'success' },
});
defineEmits(['dismiss']);
</script>

<template>
    <div class="flex items-center gap-2.5 rounded-lg border p-2.5 text-sm"
        :class="variant === 'error' ? 'border-badge-rose-foreground/20 bg-badge-rose text-badge-rose-foreground' : 'border-success-border bg-success text-success-foreground'"
        :role="variant === 'error' ? 'alert' : 'status'">
        <strong class="min-w-0 flex-1">{{ message }}</strong>
        <Button size="sm" class="shrink-0 bg-card" @click="$emit('dismiss')">Dismiss</Button>
    </div>
</template>
