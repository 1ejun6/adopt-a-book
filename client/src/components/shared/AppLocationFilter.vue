<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { onBeforeUnmount, ref, useId, watch, computed } from 'vue';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Field, FieldLabel } from '@/components/ui/field';

const props = defineProps({
  active: { type: Boolean, default: false },
  selection: { type: Object, default: null },
  defaultRadius: { type: Number, default: 3 },
  placeholder: { type: String, default: 'Postcode or address' },
  venue: Boolean,
  disabled: Boolean,
  required: Boolean,
  invalid: Boolean,
  id: String,
  address: { type: String, default: '' },
  stations: { type: Array, default: () => [] }
});
const stationIds = defineModel('stationIds', { type: String, default: '' });
const emit = defineEmits(['change', 'update:address']);
const generatedId = useId();
const inputId = computed(() => props.id || generatedId);
const query = ref(props.address), radius = ref(props.defaultRadius), location = ref(null);
const loading = ref(false), error = ref('');
const sliderValue = computed({ get: () => [radius.value], set: ([value]) => { radius.value = value; } });
let generation = 0, controller, writingAddress = false, lastLookup;
function cancel() { generation++; controller?.abort(); loading.value = false; }
onBeforeUnmount(cancel);
function setAddress(value) {
  writingAddress = true;
  query.value = value;
  emit('update:address', value);
  writingAddress = false;
}
function clear() {
  cancel(); setAddress(''); location.value = null; error.value = ''; lastLookup = null;
  radius.value = props.defaultRadius; stationIds.value = ''; emit('change', null);
}
watch(() => props.address, value => { if (value !== query.value) setAddress(value); });
watch(() => props.selection, (selection, previous) => {
  if (selection) {
    cancel(); location.value = selection.location; radius.value = selection.radiusKm;
    setAddress(selection.location.name); stationIds.value = selection.stations.map(station => station.id).join(',');
    error.value = '';
  } else if (previous && query.value === previous.location.name) {
    // A different tab/URL cleared the selection; keep separately typed draft text intact.
    cancel(); setAddress(''); location.value = null; stationIds.value = ''; radius.value = props.defaultRadius;
  }
}, { immediate: true });
watch(query, value => {
  if (writingAddress) return;
  cancel(); location.value = null; error.value = ''; lastLookup = null;
  emit('update:address', value);
  stationIds.value = ''; emit('change', null);
  if (!value.trim()) radius.value = props.defaultRadius;
}, { flush: 'sync' });
async function lookup(body, apply = true) {
  cancel(); const id = generation; controller = new AbortController();
  loading.value = true; error.value = ''; lastLookup = { body, apply };
  try {
    const result = await api('/locations/nearby', { method: 'POST', signal: controller.signal, body: { ...body, radiusKm: props.venue ? 20 : radius.value } });
    if (id !== generation) return;
    if (props.venue && !result.nearestStation) throw new Error('No nearby MRT station found. Try another address.');
    location.value = result.location;
    setAddress(result.location.name);
    if (apply) {
      stationIds.value = result.stations.map(station => station.id).join(',');
      emit('change', result);
    }
  } catch (failure) {
    if (id !== generation) return;
    error.value = failure.message || 'Could not find this address. Please retry.';
  } finally { if (id === generation) loading.value = false; }
}
function searchPlace() {
  if (loading.value || props.disabled) return;
  const text = query.value.trim().toLowerCase();
  const station = props.stations.find(station => [station.name, `${station.name} MRT`, ...(station.codes || [])].some(value => value.toLowerCase() === text));
  if (station) {
    cancel(); error.value = ''; lastLookup = null;
    location.value = { name: `${station.name} MRT`, lat: station.lat, lng: station.lng };
    setAddress(location.value.name); stationIds.value = station.id;
    emit('change', { location: location.value, nearestStation: station, stations: [station], radiusKm: props.venue ? 20 : radius.value });
    return;
  }
  if (Number.isFinite(location.value?.lat) && Number.isFinite(location.value?.lng)) return lookup({ lat: location.value.lat, lng: location.value.lng });
  if (query.value.trim()) return lookup({ query: query.value.trim() });
}
function nearMe() {
  if (!navigator.geolocation) { error.value = 'Location is unavailable in this browser. Enter an address instead.'; return; }
  cancel(); const id = generation; loading.value = true; error.value = ''; lastLookup = null;
  navigator.geolocation.getCurrentPosition(position => {
    if (id !== generation) return;
    void lookup({ lat: position.coords.latitude, lng: position.coords.longitude }, props.venue);
  }, failure => {
    if (id !== generation) return;
    loading.value = false;
    error.value = failure.code === 1 ? 'Location permission was denied. Enter an address or allow location access and retry.' : 'Could not get your location. Retry or enter an address.';
  }, { timeout: 10000, maximumAge: 60000 });
}
function retry() { if (lastLookup) void lookup(lastLookup.body, lastLookup.apply); else nearMe(); }
defineExpose({ clear });
</script>

<template>
  <component :is="props.venue ? 'div' : 'form'" class="space-y-3" :aria-busy="loading" @submit.prevent="searchPlace">
    <Field>
      <FieldLabel v-if="!props.venue" :for="inputId" class="sr-only">Location</FieldLabel>
      <div class="flex gap-2.5">
        <Button variant="outline" :loading="loading" type="button" class="location-icon-button bg-transparent size-11 shrink-0 p-0" :disabled="loading || props.disabled" @click="nearMe">
          <AppIcon name="location" :size="20" :stroke-width="1.5" />
          <span class="sr-only">Use current location</span>
        </Button>
        <Input :id="inputId" v-model="query" type="search" :placeholder="props.placeholder" class="min-w-0 flex-1 bg-transparent" :required="props.required" :disabled="props.disabled" :aria-invalid="props.invalid" :list="props.stations.length ? `${inputId}-stations` : undefined" @input="$event.target.setCustomValidity('')" @keydown.enter.stop.prevent="searchPlace" :aria-describedby="error ? `${inputId}-error` : undefined" />
        <datalist v-if="props.stations.length" :id="`${inputId}-stations`"><option v-for="station in props.stations" :key="station.id" :value="`${station.name} MRT`" /></datalist>
        <Button variant="outline" :loading="loading" :type="props.venue ? 'button' : 'submit'" @click="props.venue && searchPlace()" class="location-icon-button bg-transparent size-11 shrink-0 p-0" :disabled="loading || props.disabled || !query.trim()">
          <AppIcon name="search" :size="20" :stroke-width="1.5" />
          <span class="sr-only">Search</span>
        </Button>
        <Button v-if="props.active || query.trim() || location || stationIds" variant="outline" type="button" class="location-icon-button bg-transparent size-11 shrink-0 p-0" :disabled="props.disabled" @click="clear">
          <AppIcon name="close" :size="20" :stroke-width="1.5" />
          <span class="sr-only">{{ props.venue ? 'Clear location' : 'Clear location filter' }}</span>
        </Button>
      </div>
    </Field>
    <Field v-if="!props.venue && (query.trim() || location)" class="flex-row items-center">
      <FieldLabel class="shrink-0 whitespace-nowrap">Distance: {{ radius }} km</FieldLabel>
      <Slider v-model="sliderValue" aria-label="Search distance in kilometres" class="min-w-0 flex-1" :min="1" :max="20" :step="1" :disabled="loading" />
    </Field>
    <p v-if="props.venue && props.selection?.nearestStation" role="status" class="text-sm">Nearest MRT: {{ props.selection.nearestStation.name }}</p>
    <p v-if="loading" role="status" class="text-sm text-muted-foreground">Finding address…</p>
    <div v-if="error" :id="`${inputId}-error`" role="alert" class="space-y-2 text-sm">
      <p>{{ error }}</p><Button type="button" variant="outline" class="bg-transparent" :disabled="loading" @click="retry" :loading="loading"><AppIcon name="refresh" /><span class="sr-only">Retry location</span></Button>
    </div>
  </component>
</template>

<style scoped>
.location-icon-button :deep(svg) { width: 20px; height: 20px; }
.location-icon-button:disabled { opacity: 1; cursor: not-allowed; }
</style>
