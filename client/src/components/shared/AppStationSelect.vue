<script setup>
import { ref, watch, useId, nextTick } from 'vue';
import { Input } from '@/components/ui/input';
defineOptions({ inheritAttrs: false });
const props = defineProps({ stations: { type: Array, default: () => [] }, disabled: Boolean });
const model = defineModel({ type: String, default: '' });
const emit = defineEmits(['change']);
const listId = useId();
const input = ref(null), query = ref('');
const label = station => `${station.name}${station.codes?.length ? ` (${station.codes.join(' / ')})` : ''}`;
function validity() { input.value?.$el?.setCustomValidity(query.value && !model.value ? 'Choose an MRT station from the suggestions.' : ''); }
watch([model, () => props.stations], () => {
  const station = props.stations.find(station => station.id === model.value);
  if (station) query.value = label(station);
  else if (!model.value && !input.value?.$el?.matches(':focus')) query.value = '';
  nextTick(validity);
}, { immediate: true });
function choose(value) {
  query.value = value;
  const text = value.trim().toLowerCase();
  model.value = props.stations.find(station => [label(station), station.name].some(name => name.toLowerCase() === text))?.id || '';
  nextTick(validity);
  emit('change');
}
</script>
<template>
  <Input ref="input" v-bind="$attrs" :modelValue="query" :list="listId" autocomplete="off" placeholder="Search MRT stations" :disabled="disabled" @update:modelValue="choose" />
  <datalist :id="listId"><option v-for="station in stations" :key="station.id" :value="label(station)" /></datalist>
</template>
