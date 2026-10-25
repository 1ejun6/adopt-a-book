<script setup>
import { computed, ref, useId, watch } from 'vue';
import { Cancel01Icon, Location08Icon } from '@hugeicons/core-free-icons';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';

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
//@ChitanyaBharathi > place the server resolved > reused when only the radius changes > no new OneMap lookup
const location = ref(null);
const loading = ref(false);
const error = ref('');

async function lookup(body) {
  loading.value = true;
  error.value = '';
  try {
  //@ChitanyaBharathi - ...body = make a copy but not exactly a copy becauuse if not itll be an object in an object
    const result = await api('/locations/nearby', { method: 'POST', body: { ...body, radiusKm: radius.value } });
    location.value = result.location;
    stationIds.value = result.stations.map(station => station.id).join(',');
    emit('change', result);
  } catch (lookupError) {
    error.value = lookupError.message;
  } finally {
    loading.value = false;
  }
}

function searchPlace() {
  if (query.value.trim()) lookup({ query: query.value.trim() });
}

//@ChitanyaBharathi > browser asks permission > coordinates skip OneMap so it works without the token
function nearMe() {
  if (!navigator.geolocation) {
    error.value = 'your browser cannot share its location > try a postcode instead';
    return;
  }
  loading.value = true;
  navigator.geolocation.getCurrentPosition(
    position => {
      //@ChitanyaBharathi > near me button if clicked, empties the input search box
      location.value = null;
      query.value = '';
      lookup({ lat: position.coords.latitude, lng: position.coords.longitude });
    },
    () => {
      loading.value = false;
      error.value = 'could not get your location > try a postcode instead';
    }
  );
}

function changeRadius() {
  if (location.value) lookup({ lat: location.value.lat, lng: location.value.lng });
}

//@ChitanyaBharathi > X in the search box (or deleting the text) empties query > drop the location filter too
watch(query, value => {
  if (!value.trim() && location.value) clear();
});

function clear() {
  query.value = '';
  radius.value = props.defaultRadius;
  location.value = null;
  error.value = '';
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
        <!--@ChitanyaBharathi > 24px icon + tiny caption still fit inside the button's h-9-->
        <Button type="button" variant="outline" class="flex-col px-2" title="Use my current location" :disabled="loading" @click="nearMe">
          <HugeiconsIcon :icon="Location08Icon" aria-hidden="true" />
          <span class="text-[0.625rem] leading-none whitespace-nowrap">near me</span>
        </Button>
        <!--@ChitanyaBharathi > type text hides the tiny browser X > own X button below is a bigger click target-->
        <div class="relative flex-1">
          <Input :id="inputId" v-model="query" type="text" class="pr-9" :placeholder="props.placeholder" />
          <button v-if="query" type="button" aria-label="Clear location" class="absolute inset-y-0 right-0 px-2.5" @click="query = ''">
            <HugeiconsIcon :icon="Cancel01Icon" class="size-4" aria-hidden="true" />
          </button>
        </div>
        <Button type="submit" :disabled="loading || !query.trim()">Search</Button>
      </div>
    </Field>

    <!--@ChitanyaBharathi > value-commit > only search again when the thumb is released > not on every drag-->
    <!--@ChitanyaBharathi > greyed out until a location is found > distance means nothing without a starting point-->
    <Field :class="{ 'opacity-50': !location }">
      <FieldLabel>Distance: {{ radius }} km</FieldLabel>
      <Slider v-model="sliderValue" :min="1" :max="20" :step="1" :disabled="loading || !location" @value-commit="changeRadius" />
    </Field>

    <FieldError v-if="error">{{ error }}</FieldError>
    <FieldDescription v-else-if="loading">Finding nearby collection points...</FieldDescription>
    <FieldDescription v-else-if="location">Within {{ radius }} km of {{ location.name }}</FieldDescription>
    <FieldDescription v-else>Search a location or use your current location first</FieldDescription>
  </form>
</template>
