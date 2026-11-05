<script setup>
import { computed, nextTick, ref, useId } from 'vue';
import genres from '../../../../shared/genres.json';
const selected = defineModel({ type: Array, default: () => [] });
const props = defineProps({ disabled: Boolean, compact: Boolean, required: Boolean, error: { type: String, default: '' } });
const expanded = ref(false);
const fieldset = ref(null);
const toggle = ref(null);
const id = useId();
const visibleGenres = computed(() => !props.compact || expanded.value
  ? genres
  : genres.filter((genre, index) => index < 8 || selected.value.includes(genre)));
defineExpose({ focus: () => fieldset.value?.querySelector('input')?.focus() });
function restoreGenreFocus(event) {
  if (props.compact && !expanded.value && !event.target.checked && genres.indexOf(event.target.value) >= 8) {
    nextTick(() => toggle.value?.focus());
  }
}
</script>

<template>
  <fieldset ref="fieldset" :disabled="disabled" class="genre-picker" :aria-invalid="!!error || undefined"
    :aria-describedby="error ? `${id}-help ${id}-error` : `${id}-help`">
    <legend>Favourite genres{{ required ? ' (required)' : '' }}</legend>
    <p :id="`${id}-help`" class="genre-help">{{ required ? 'Choose at least one genre for your shelf. You can change these in your account.' : 'Choose one or more for your shelf.' }}</p>
    <div :id="`${id}-options`" class="genre-options">
      <label v-for="genre in visibleGenres" :key="genre" class="genre-option">
        <input v-model="selected" type="checkbox" :aria-label="genre" :value="genre" class="genre-input" @change="restoreGenreFocus" />
        <span class="genre-chip">
          <span class="genre-check" aria-hidden="true">{{ selected.includes(genre) ? '✓' : '+' }}</span>
          {{ genre }}
        </span>
      </label>
    </div>
    <button v-if="compact" ref="toggle" type="button" class="min-h-11 py-2 text-sm underline underline-offset-4"
      :aria-expanded="expanded" :aria-controls="`${id}-options`" @click="expanded = !expanded">
      {{ expanded ? 'Show fewer genres' : `Show all genres (${genres.length})` }}
    </button>
    <p v-if="error" :id="`${id}-error`" role="alert" class="text-sm text-destructive">{{ error }}</p>
    <p class="genre-count" role="status">{{ selected.length }} selected</p>
  </fieldset>
</template>

<style scoped>
.genre-picker { min-width: 0; margin-block: 1.25rem; }
.genre-help, .genre-count { font-size: 0.875rem; line-height: 1.5; color: var(--muted-foreground); }
.genre-help { margin: 0.375rem 0 0.75rem; }
.genre-count { margin-top: 0.625rem; }
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
