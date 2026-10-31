<script setup>
import { computed, ref, useId, watch } from 'vue';
import { toast } from 'vue-sonner';
import { Location08Icon } from '@hugeicons/core-free-icons';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';

const props = defineProps({
  defaultRadius: { type: Number, default: 3 },
  placeholder: { type: String, default: 'postcode or place, eg. 238801 or Bishan' }
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
const loading = ref(false);

async function lookup(body) {
  loading.value = true;
  try {
    //@ChitanyaBharathi - ...body = make a copy but not exactly a copy becauuse if not itll be an object in an object
    const result = await api('/locations/nearby', { method: 'POST', body: { ...body, radiusKm: radius.value } });
    location.value = result.location;
    stationIds.value = result.stations.map(station => station.id).join(',');
    emit('change', result);
    toast.success('location filter applied', {
      description: `within ${result.radiusKm} km of ${result.location.name}`,
    });
  } catch (lookupError) {
    toast.error(lookupError.message || 'could not search this location > please try again');
  } finally {
    loading.value = false;
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
  loading.value = true;
  navigator.geolocation.getCurrentPosition(
    position => {
      //@ChitanyaBharathi > near me button if clicked, empties the input search box
      query.value = '';
      location.value = { name: 'your current location', lat: position.coords.latitude, lng: position.coords.longitude };
      loading.value = false;
      toast.info('current location ready', { description: 'adjust distance & click search' });
    },
    error => {
      loading.value = false;
      const messages = {
        1: String.raw`location permission denied > allow location access \ enter a postcode`,
        2: 'your location is unavailable > try a postcode instead',
        3: String.raw`getting your location timed out > try again \ enter a postcode`,
      };
      toast.error(messages[error.code] || 'could not get your location > try a postcode instead');
    }
  );
}

//@ChitanyaBharathi > X in the search box (or deleting the text) empties query > drop the location filter too
watch(query, value => {
  if (!value.trim()) clear();
  else location.value = null;
}, { flush: 'sync' });

function clear() {
  query.value = '';
  radius.value = props.defaultRadius;
  location.value = null;
  stationIds.value = '';
  emit('change', null);
}
</script>

<template>
  <!--@ChitanyaBharathi > the form is the card itself > no extra wrapper-->
  <form class="space-y-5 rounded-lg border p-5" @submit.prevent="searchPlace">
    <Field>
      <FieldLabel :for="inputId">Location</FieldLabel>
      <div class="flex gap-2.5">
        <Button type="button" variant="outline" size="icon" :disabled="loading" @click="nearMe">
          <HugeiconsIcon :icon="Location08Icon" aria-hidden="true" />
        </Button>
        <Input :id="inputId" v-model="query" type="search" :placeholder="props.placeholder" />
        <Button type="submit" :disabled="loading || (!query.trim() && !location)">Search</Button>
      </div>
    </Field>

    <!-- Choose a distance first; only Search applies it. -->
    <Field v-if="query.trim() || location">
      <FieldLabel>Distance: {{ radius }} km</FieldLabel>
      <Slider v-model="sliderValue" :min="1" :max="20" :step="1" :disabled="loading" />
    </Field>

    <FieldDescription v-if="loading">loading location...</FieldDescription>
    <FieldDescription v-else-if="location">{{ location.name }} selected > adjust distance & click search</FieldDescription>
    <FieldDescription v-else>enter a postcode \ select your location > choose a distance & click search</FieldDescription>
  </form>
</template>
