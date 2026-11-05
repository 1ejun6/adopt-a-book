<script setup>
import { Cancel01Icon } from '@hugeicons/core-free-icons';

defineProps({ disabled: Boolean, label: { type: String, default: 'Clear field' } });
defineEmits(['clear']);
</script>

<template>
  <button type="button" :disabled="disabled" :aria-label="label"
    class="absolute inset-y-0 right-0 grid min-h-11 min-w-11 place-items-center rounded-lg px-2.5"
    @click="$emit('clear')">
    <HugeiconsIcon :icon="Cancel01Icon" class="size-5" aria-hidden="true" />
  </button>
</template>
