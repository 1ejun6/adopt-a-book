<script setup>
import { computed } from 'vue';
import { HugeiconsIcon } from '@hugeicons/vue';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { adoptionProgress } from '@/lib/adoptions';

const props = defineProps({
  applicationStatus: { type: String, default: 'pending' },
  pickupStatus: { type: String, default: '' },
  verified: { type: Boolean, default: true },
  editingPickup: { type: Boolean, default: false },
});
const progress = computed(() => {
  if (!props.verified) return null;
  const recorded = adoptionProgress(props.applicationStatus, props.pickupStatus);
  // Highlight the task being edited without marking an unsent pickup request complete.
  return props.editingPickup && recorded?.current >= 3 ? { current: 3, completed: 2 } : recorded;
});
const labels = ['Choose', 'Request', 'Pickup', 'Collect'];
</script>

<template>
  <ol v-if="progress" class="adoption-progress" aria-label="Adoption progress">
    <li
      v-for="(label, index) in labels"
      :key="label"
      :class="{ complete: index < progress.completed, current: index + 1 === progress.current }"
      :aria-current="index + 1 === progress.current ? 'step' : undefined"
    >
      <span class="progress-number" aria-hidden="true">
        <HugeiconsIcon v-if="index < progress.completed" :icon="Tick02Icon" class="size-4" />
        <span v-else>{{ index + 1 }}</span>
      </span>
      <span>{{ label }}</span>
      <span class="sr-only">{{
        index < progress.completed
          ? 'complete'
          : index + 1 === progress.current
            ? 'current step'
            : 'not complete'
      }}</span>
    </li>
  </ol>
</template>

<style scoped>
.adoption-progress {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.adoption-progress li {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  border-top: 2px solid var(--border);
  padding-top: 8px;
  color: var(--muted-foreground);
  font-size: 0.875rem;
}
.adoption-progress li.complete,
.adoption-progress li.current {
  border-color: var(--foreground);
  color: var(--foreground);
}
.progress-number {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 50%;
  background: var(--badge-neutral);
  font-size: 1rem;
}
.complete .progress-number {
  background: var(--badge-green);
}
.current .progress-number {
  background: var(--foreground);
  color: var(--background);
}
</style>
