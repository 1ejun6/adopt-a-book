<script setup>
import { ref, useId } from 'vue';
import genres from '../../../../shared/genres.json';
const selected = defineModel({ type: Array, default: () => [] });
defineProps({ disabled: Boolean, required: Boolean, showCount: { type: Boolean, default: true }, error: { type: String, default: '' } });
const fieldset = ref(null);
const id = useId();
defineExpose({ focus: () => fieldset.value?.querySelector('input')?.focus() });
</script>

<template>
  <fieldset ref="fieldset" :disabled="disabled" class="genre-picker" :aria-invalid="!!error || undefined"
    :aria-describedby="[required && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') || undefined">
    <legend class="genre-heading">
      <span>Favourite genres{{ required ? ' (required)' : '' }}</span>
      <span v-if="showCount" class="genre-count" role="status">{{ selected.length }} selected</span>
    </legend>
    <p v-if="required" :id="`${id}-help`" class="genre-help">Choose at least one genre for your shelf. You can change these in your account.</p>
    <div :id="`${id}-options`" class="genre-options">
      <label v-for="genre in genres" :key="genre" class="genre-option">
        <input v-model="selected" type="checkbox" :aria-label="genre" :value="genre" class="genre-input" />
        <span class="genre-chip">
          <span class="genre-check" aria-hidden="true">{{ selected.includes(genre) ? '✓' : '+' }}</span>
          {{ genre }}
        </span>
      </label>
    </div>
    <p v-if="error" :id="`${id}-error`" role="alert" class="text-sm text-destructive">{{ error }}</p>
  </fieldset>
</template>

<style scoped>
.genre-picker { min-width: 0; margin-block: 0.625rem; }
.genre-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.625rem; width: 100%; margin-bottom: 0.625rem; }
.genre-help, .genre-count { font-size: 0.875rem; line-height: 1.5; color: var(--muted-foreground); }
.genre-help { margin: 0.375rem 0 0.75rem; }
.genre-options { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.genre-option { position: relative; max-width: 100%; cursor: pointer; }
.genre-input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.genre-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.875rem;
  line-height: 1.5;
}
.genre-check { width: 0.75rem; text-align: center; flex-shrink: 0; }
input:checked + .genre-chip { background: var(--badge-neutral); border-color: var(--foreground); }
input:focus-visible + .genre-chip { outline: 2px solid var(--foreground); outline-offset: 3px; }
input:disabled + .genre-chip { opacity: 0.5; cursor: default; }
</style>
