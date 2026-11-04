<script setup>
const status = defineModel('status', { type: String, default: 'all' });
const options = [
  { value: 'open', color: 'bg-badge-green' },
  { value: 'closed', color: 'bg-badge-rose' },
  { value: 'cancelled', color: 'bg-badge-neutral' },
];
</script>

<template>
  <div class="flex flex-wrap gap-2.5 text-sm" role="group">
    <button v-for="option in options" :key="option.value" type="button" class="rounded-lg border px-2.5 py-1" :class="[option.color, { 'border-foreground': status === option.value }]" :aria-pressed="status === option.value" @click="status = status === option.value ? 'all' : option.value">{{ option.value }}</button>
  </div>
</template>
