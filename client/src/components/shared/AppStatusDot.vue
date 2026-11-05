<script setup>
defineProps({ tone: { type: String, default: 'neutral' } });
const tones = {
  green: 'bg-badge-green border-success-foreground',
  red: 'bg-destructive/10 border-destructive',
  purple: 'bg-badge-purple border-badge-purple-foreground',
  amber: 'bg-badge-amber border-amber-700',
  neutral: 'bg-badge-neutral border-muted-foreground',
};
</script>

<template>
  <span class="inline-block size-3 shrink-0 rounded-full border" :class="tones[tone] || tones.neutral" aria-hidden="true" />
</template>
