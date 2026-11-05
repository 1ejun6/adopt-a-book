<script setup>
import { onBeforeUnmount, ref, useId, watch, computed } from 'vue';
import { Location08Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Field, FieldLabel } from '@/components/ui/field';

const props = defineProps({ selection: { type: Object, default: null }, defaultRadius: { type: Number, default: 3 }, placeholder: { type: String, default: 'Postcode or address' } });
const stationIds = defineModel('stationIds', { type: String, default: '' });
const emit = defineEmits(['change']);
const inputId = useId();
const query = ref(''), radius = ref(props.defaultRadius), location = ref(null);
const loading = ref(false), error = ref('');
const sliderValue = computed({ get: () => [radius.value], set: ([value]) => { radius.value = value; } });
let generation = 0, controller, writingAddress = false, lastLookup;
function cancel() { generation++; controller?.abort(); loading.value = false; }
onBeforeUnmount(cancel);
function setAddress(value) {
  writingAddress = true;
  query.value = value;
  writingAddress = false;
}
function clear() {
  cancel(); setAddress(''); location.value = null; error.value = ''; lastLookup = null;
  radius.value = props.defaultRadius; stationIds.value = ''; emit('change', null);
}
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
  stationIds.value = ''; emit('change', null);
  if (!value.trim()) radius.value = props.defaultRadius;
}, { flush: 'sync' });
async function lookup(body, apply = true) {
  cancel(); const id = generation; controller = new AbortController();
  loading.value = true; error.value = ''; lastLookup = { body, apply };
  try {
    const result = await api('/locations/nearby', { method: 'POST', signal: controller.signal, body: { ...body, radiusKm: radius.value } });
    if (id !== generation) return;
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
  if (loading.value) return;
  if (location.value) return lookup({ lat: location.value.lat, lng: location.value.lng });
  if (query.value.trim()) return lookup({ query: query.value.trim() });
}
function nearMe() {
  if (!navigator.geolocation) { error.value = 'Location is unavailable in this browser. Enter an address instead.'; return; }
  cancel(); const id = generation; loading.value = true; error.value = ''; lastLookup = null;
  navigator.geolocation.getCurrentPosition(position => {
    if (id !== generation) return;
    void lookup({ lat: position.coords.latitude, lng: position.coords.longitude }, false);
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
  <form class="space-y-3" :aria-busy="loading" @submit.prevent="searchPlace">
    <Field>
      <FieldLabel :for="inputId" class="sr-only">Location</FieldLabel>
      <div class="flex gap-2.5">
        <button type="button" class="location-icon-button grid size-11 shrink-0 place-items-center rounded-lg border" :disabled="loading" @click="nearMe">
          <HugeiconsIcon :icon="Location08Icon" :size="20" :stroke-width="1.5" aria-hidden="true" />
          <span class="sr-only">Use current location</span>
        </button>
        <Input :id="inputId" v-model="query" type="search" :placeholder="props.placeholder" class="min-w-0 flex-1" :aria-describedby="error ? `${inputId}-error` : undefined" />
        <button type="submit" class="location-icon-button grid size-11 shrink-0 place-items-center rounded-lg border" :disabled="loading || !query.trim()">
          <HugeiconsIcon :icon="Search01Icon" :size="20" :stroke-width="1.5" aria-hidden="true" />
          <span class="sr-only">Search</span>
        </button>
      </div>
    </Field>
    <Field v-if="query.trim() || location" class="flex-row items-center">
      <FieldLabel class="shrink-0 whitespace-nowrap">Distance: {{ radius }} km</FieldLabel>
      <Slider v-model="sliderValue" aria-label="Search distance in kilometres" class="min-w-0 flex-1" :min="1" :max="20" :step="1" :disabled="loading" />
    </Field>
    <p v-if="loading" role="status" class="text-sm text-muted-foreground">Finding address…</p>
    <div v-if="error" :id="`${inputId}-error`" role="alert" class="space-y-2 text-sm">
      <p>{{ error }}</p><Button type="button" variant="outline" :disabled="loading" @click="retry">Retry location</Button>
    </div>
  </form>
</template>

<style scoped>
.location-icon-button:disabled { opacity: 1; cursor: not-allowed; }
</style>
