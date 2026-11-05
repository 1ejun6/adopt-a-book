<script setup>
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';

defineProps({
  label: { type: String, required: true },
  action: { type: String, default: '' },
});
const emit = defineEmits(['open']);
</script>

<template>
  <button
    type="button"
    class="adoption-row adoption-columns hover:bg-primary data-[active]:bg-primary"
    :aria-label="label"
    @click="emit('open')"
  >
    <span class="adoption-row__book"><slot name="book" /></span>
    <span class="adoption-row__status"><slot name="status" /></span>
    <span class="adoption-row__pickup">
      <span class="adoption-row__mobile-label" aria-hidden="true">Pickup · SGT</span>
      <span class="min-w-0"><slot name="pickup" /></span>
    </span>
    <span class="adoption-row__action" aria-hidden="true">
      <span v-if="action" class="adoption-row__action-label">{{ action }}</span>
      <HugeiconsIcon
        :icon="ArrowRight01Icon"
        class="size-4 shrink-0"
      />
    </span>
  </button>
</template>
