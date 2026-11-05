<script setup>
import { ref, useAttrs } from 'vue';
import AppInputClear from '@/components/shared/AppInputClear.vue';
import { cn } from '@/lib/utils';

defineOptions({ inheritAttrs: false });
const props = defineProps({ class: { type: null, required: false } });
const model = defineModel({ type: String, default: '' });
const attrs = useAttrs();
const input = ref(null);
function clear() {
  if (!input.value || input.value.disabled || input.value.readOnly || input.value.matches(':disabled')) return;
  input.value.value = '';
  input.value.dispatchEvent(new Event('input', { bubbles: true }));
  input.value.focus();
}
</script>

<template>
  <div class="relative min-w-0">
    <textarea ref="input" v-model="model" v-bind="attrs" :class="cn('w-full bg-transparent', props.class, 'pr-11')" />
    <AppInputClear class="bottom-auto" :disabled="!model || attrs.disabled !== undefined && attrs.disabled !== false || attrs.readonly !== undefined && attrs.readonly !== false"
      :label="`Clear ${attrs['aria-label'] || attrs.placeholder || 'field'}`" @clear="clear" />
  </div>
</template>
