<script setup>
import { useVModel } from '@vueuse/core';
import { computed, ref, useAttrs } from 'vue';
import { cn } from '@/lib/utils';
import AppInputClear from '@/components/shared/AppInputClear.vue';

defineOptions({ inheritAttrs: false });
const props = defineProps({
  defaultValue: { type: [String, Number], required: false },
  modelValue: { type: [String, Number], required: false },
  class: { type: null, required: false },
  clearButtonClass: { type: String, default: '' },
});
const emits = defineEmits(['update:modelValue']);
const attrs = useAttrs();
const input = ref(null);
const modelValue = useVModel(props, 'modelValue', emits, { passive: true, defaultValue: props.defaultValue });
const hasValue = computed(() => modelValue.value !== '' && modelValue.value != null);
const clearable = computed(() => !['file', 'checkbox', 'radio', 'range', 'color', 'hidden', 'submit', 'reset', 'button'].includes(attrs.type));
const nativeControls = computed(() => ['date', 'datetime-local', 'time', 'month', 'week', 'number'].includes(attrs.type));
function clear() {
  if (!input.value || input.value.disabled || input.value.readOnly || input.value.matches(':disabled')) return;
  input.value.value = '';
  input.value.dispatchEvent(new Event('input', { bubbles: true }));
  input.value.focus();
}
defineExpose({ input, focus: () => input.value?.focus() });
</script>

<template>
  <div data-slot="input-wrapper" :class="cn('relative min-w-0 rounded-lg border bg-transparent text-base', props.class)">
    <input ref="input" v-model="modelValue" v-bind="attrs" data-slot="input" :class="cn(
      'block min-h-11 w-full rounded-lg bg-transparent px-3 placeholder:text-muted-foreground',
      clearable && (nativeControls || clearButtonClass ? 'pr-22' : 'pr-11'),
    )" />
    <AppInputClear v-if="clearable" :disabled="!hasValue || attrs.disabled !== undefined && attrs.disabled !== false || attrs.readonly !== undefined && attrs.readonly !== false"
      :class="clearButtonClass || (nativeControls ? 'right-11' : '')"
      :label="`Clear ${attrs['aria-label'] || attrs.placeholder || attrs.name || 'field'}`" @clear="clear" />
  </div>
</template>

<style scoped>
[data-slot='input-wrapper']:has(input[aria-invalid='true']) { border-color: var(--destructive); }
input[type='search']::-webkit-search-cancel-button { -webkit-appearance: none; }
</style>
