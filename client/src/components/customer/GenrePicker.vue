<script setup>
import genres from '../../../../shared/genres.json';
const selected = defineModel({ type: Array, default: () => [] });
defineProps({ disabled: Boolean });
</script>

<template>
  <fieldset :disabled="disabled" class="genre-picker">
    <legend>Favourite genres</legend>
    <p class="genre-help">Choose one or more for your shelf.</p>
    <div class="genre-options">
      <label v-for="genre in genres" :key="genre" class="genre-option">
        <input v-model="selected" type="checkbox" :aria-label="genre" :value="genre" class="genre-input" />
        <span class="genre-chip">
          <span class="genre-check" aria-hidden="true">{{ selected.includes(genre) ? '✓' : '+' }}</span>
          {{ genre }}
        </span>
      </label>
    </div>
    <p class="genre-count" role="status">{{ selected.length }} selected</p>
  </fieldset>
</template>

<style scoped>
.genre-picker { min-width: 0; margin-block: 1.25rem; }
legend { font-weight: 500; }
.genre-help, .genre-count { font-size: 0.75rem; color: var(--muted-foreground); }
.genre-help { margin: 0.375rem 0 0.75rem; }
.genre-count { margin-top: 0.625rem; }
.genre-options { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.genre-option { position: relative; max-width: 100%; cursor: pointer; }
.genre-input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.genre-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 34px;
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 0.75rem;
  line-height: 1.3;
}
.genre-check { width: 0.75rem; text-align: center; flex-shrink: 0; }
input:checked + .genre-chip { background: var(--badge-neutral); border-color: var(--foreground); }
input:focus-visible + .genre-chip { outline: 2px solid var(--foreground); outline-offset: 3px; }
input:disabled + .genre-chip { opacity: 0.5; cursor: default; }
</style>
