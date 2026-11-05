<script setup>
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue';
import { toast } from 'vue-sonner';
import { Location08Icon } from '@hugeicons/core-free-icons';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';

const props = defineProps({
  defaultRadius: { type: Number, default: 3 },
  placeholder: { type: String, default: 'postcode or place' }
});

const stationIds = defineModel('stationIds', { type: String, default: '' });
const emit = defineEmits(['change']);

//@ChitanyaBharathi > useId > unique id per copy > label still points at its own input when a page has 2 filters
const inputId = useId();
const query = ref('');
const radius = ref(props.defaultRadius);
//@ChitanyaBharathi > Slider wants an array (one per thumb) > wrap it so radius stays a plain number
const sliderValue = computed({
  get: () => [radius.value],
  set: ([value]) => { radius.value = value; }
});
//@ChitanyaBharathi > keep device coordinates ready until search applies selected distance
const location = ref(null);
const usingCurrentLocation = ref(false);
const nearestStation = ref(null);
const locationInput = ref(null);
const locationLabel = computed(() => { if (!location.value) return '';
  if (usingCurrentLocation.value) {
    if (nearestStation.value?.name) {
      return `Near ${nearestStation.value.name}`;
   }

    return `${Number(location.value.lat).toFixed(4)}, ${Number(location.value.lng).toFixed(4)}`;
  }

  return location.value.name || query.value.trim();
});

function changeLocation() {
  clear();
  locationInput.value?.$el?.focus();
}
const loading = ref(false);
let requestId = 0;
let controller;
let clearing = false;

function cancelLookup() {
  requestId++;
  controller?.abort();
  loading.value = false;
}

onBeforeUnmount(cancelLookup);

async function lookup(body) {
  cancelLookup();
  const id = requestId;
  controller = new AbortController();
  loading.value = true;
  try {
    //@ChitanyaBharathi - ...body = make a copy but not exactly a copy becauuse if not itll be an object in an object
    const result = await api('/locations/nearby', { method: 'POST', signal: controller.signal, body: { ...body, radiusKm: radius.value } });
    if (id !== requestId) return;
    location.value = result.location;
    nearestStation.value = result.nearestStation;
    stationIds.value = result.stations.map(station => station.id).join(',');
    emit('change', result);
    toast.success('location filter applied');
  } catch (lookupError) {
    if (id !== requestId) return;
    toast.error(lookupError.message || 'could not search this location > please try again');
  } finally {
    if (id === requestId) loading.value = false;
  }
}

function searchPlace() {
  if (loading.value) return;
  if (query.value.trim()) lookup({ query: query.value.trim() });
  else if (location.value) lookup({ lat: location.value.lat, lng: location.value.lng });
}

//@ChitanyaBharathi > browser asks permission > coordinates skip OneMap so it works without the token
function nearMe() {
  if (!navigator.geolocation) {
    toast.error('your browser cannot share its location > try a postcode instead');
    return;
  }
  cancelLookup();
  const id = requestId;
  loading.value = true;
  navigator.geolocation.getCurrentPosition(
    position => {
      //@ChitanyaBharathi > near me button if clicked, empties the input search box
      if (id !== requestId) return;
      clear();
      usingCurrentLocation.value = true;
      location.value = { name: 'your current location', lat: position.coords.latitude, lng: position.coords.longitude };
      loading.value = false;
      toast.info('current location ready', { description: 'adjust distance & click search' });
    },
    error => {
      if (id !== requestId) return;
      loading.value = false;
      const messages = {
        1: String.raw`location permission denied > allow location access \ enter a postcode`,
        2: 'your location is unavailable > try a postcode instead',
        3: String.raw`getting your location timed out > try again \ enter a postcode`,
      };
      toast.error(messages[error.code] || 'could not get your location > try a postcode instead');
    },
    { timeout: 10000, maximumAge: 60000 }
  );
}

//@ChitanyaBharathi > X in the search box (or deleting the text) empties query > drop the location filter too
watch(query, value => {
  if (clearing) return;
  cancelLookup();
  if (!value.trim()) {
  clear();
} else {
  location.value = null;
  nearestStation.value = null;
  usingCurrentLocation.value = false;
}});

function clear() {
  cancelLookup();
  clearing = true;
  query.value = '';
  clearing = false;
  radius.value = props.defaultRadius;
  location.value = null;
  stationIds.value = '';
  emit('change', null);
  usingCurrentLocation.value = false;
  nearestStation.value = null;
}

defineExpose({ clear });
</script>

<template>
  <!--@ChitanyaBharathi > the form is the card itself > no extra wrapper-->
  <form class="space-y-3 rounded-lg border p-4" :aria-busy="loading" @submit.prevent="searchPlace">
    <Field>
      <FieldLabel :for="inputId" class="sr-only">location</FieldLabel>
      <div class="flex gap-2.5">
        <Button type="button" variant="outline" :disabled="loading" @click="nearMe">
          <HugeiconsIcon :icon="Location08Icon" aria-hidden="true" />
          <span class="sr-only">use current location</span>
        </Button>
        <Input ref="locationInput" :id="inputId" v-model="query" type="search" :placeholder="props.placeholder" class="flex-1" />
        <Button type="submit" :disabled="loading || (!query.trim() && !location)">search</Button>
      </div>
    </Field>

    <div v-if="location" class="flex items-start justify-between gap-3 text-sm" role="status">
  <div class="min-w-0 space-y-1">
    <p class="text-muted-foreground">
      {{ usingCurrentLocation ? 'Using your current location' : 'Selected location' }}
    </p>
    <p class="break-words">
      {{ locationLabel }}
    </p>

    <p v-if="usingCurrentLocation && !nearestStation" class="text-xs text-muted-foreground">
      Select Search to find nearby MRT stations.
    </p>
  </div>

    <button type="button" class="shrink-0 underline underline-offset-4" :disabled="loading" @click="changeLocation">
      Change
    </button>
    </div>

    <!-- Choose a distance first; only Search applies it. -->
    <Field v-if="query.trim() || location" class="flex-row items-center">
      <FieldLabel class="shrink-0 whitespace-nowrap">Distance: {{ radius }} km</FieldLabel>
      <Slider v-model="sliderValue" class="min-w-0 flex-1" :min="1" :max="20" :step="1" :disabled="loading" />
    </Field>

    <FieldDescription v-if="loading" role="status" >loading location..</FieldDescription>
  </form>
</template>
