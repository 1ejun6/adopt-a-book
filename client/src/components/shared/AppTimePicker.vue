<script setup>
import { ref, watch } from 'vue';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

defineOptions({ inheritAttrs: false });
const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, default: 'Time' },
  disabled: Boolean,
  invalid: Boolean,
});
const model = defineModel({ type: String, default: '' });
const hour = ref('');
const minute = ref('');
const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
watch(model, value => {
  [hour.value, minute.value] = /^\d{2}:\d{2}$/.test(value) ? value.split(':') : ['', ''];
}, { immediate: true });
function update(part, value) {
  if (part === 'hour') hour.value = value;
  else minute.value = value;
  model.value = hour.value && minute.value ? `${hour.value}:${minute.value}` : '';
}
</script>

<template>
  <div class="flex min-w-0 items-center gap-2" role="group" :aria-label="`${props.label}, 24-hour time`">
    <Select :modelValue="hour" :disabled="props.disabled" @update:modelValue="update('hour', $event)">
      <SelectTrigger :id="props.id" :aria-label="`${props.label} hour`" :aria-invalid="props.invalid || undefined"><SelectValue placeholder="Hour" /></SelectTrigger>
      <SelectContent><SelectItem v-for="value in hours" :key="value" :value="value">{{ value }}</SelectItem></SelectContent>
    </Select>
    <span class="text-muted-foreground" aria-hidden="true">:</span>
    <Select :modelValue="minute" :disabled="props.disabled" @update:modelValue="update('minute', $event)">
      <SelectTrigger :id="`${props.id}-minute`" :aria-label="`${props.label} minute`" :aria-invalid="props.invalid || undefined"><SelectValue placeholder="Minute" /></SelectTrigger>
      <SelectContent><SelectItem v-for="value in minutes" :key="value" :value="value">{{ value }}</SelectItem></SelectContent>
    </Select>
  </div>
</template>
