<script setup>
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

defineProps({ label: { type: String, required: true } });
const emit = defineEmits(['open']);
</script>

<template>
  <button
    type="button"
    class="adoption-row adoption-columns washi-tape-hover"
    :aria-label="label"
    @click="emit('open')"
  >
    <span class="adoption-row__book"><slot name="book" /></span>
    <span class="adoption-row__status"><slot name="status" /></span>
    <span class="adoption-row__pickup">
      <span class="adoption-row__mobile-label" aria-hidden="true">Pickup · SGT</span>
      <span class="min-w-0"><slot name="pickup" /></span>
    </span>
    <HugeiconsIcon
      :icon="ArrowRight01Icon"
      class="adoption-row__arrow size-5 shrink-0"
      aria-hidden="true"
    />
  </button>
</template>
