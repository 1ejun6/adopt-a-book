<script setup>
import { ref, useId } from 'vue';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Field, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field';

const props = defineProps({
  defaultRadius: { type: Number, default: 3 },
  placeholder: { type: String, default: 'postcode or place, eg. 238801 or Bishan' }
});

//@ChitanyaBharathi > comma separated MRT station ids inside the radius > '' means no location filter
//@ChitanyaBharathi > pass straight into the mrtstationids query of GET /books or GET /drives
const stationIds = defineModel('stationIds', { type: String, default: '' });
const emit = defineEmits(['change']);

//@ChitanyaBharathi > useId > unique id per copy > label still points at its own input when a page has 2 filters
const inputId = useId();
const query = ref('');
//@ChitanyaBharathi > slider value is an array > one number per thumb
const radius = ref([props.defaultRadius]);
//@ChitanyaBharathi > place the server resolved > reused when only the radius changes > no new OneMap lookup
const location = ref(null);
const loading = ref(false);
const error = ref('');

async function lookup(body) {
  loading.value = true;
  error.value = '';
  try {
    const result = await api('/locations/nearby', { method: 'POST', body: { ...body, radiusKm: radius.value[0] } });
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
    position => lookup({ lat: position.coords.latitude, lng: position.coords.longitude }),
    () => {
      loading.value = false;
      error.value = 'could not get your location > try a postcode instead';
    }
  );
}

function changeRadius() {
  if (location.value) lookup({ lat: location.value.lat, lng: location.value.lng });
}

function clear() {
  query.value = '';
  radius.value = [props.defaultRadius];
  location.value = null;
  error.value = '';
  stationIds.value = '';
  emit('change', null);
}
</script>

<template>
  <section class="space-y-5 rounded-lg border p-5">
    <!--@ChitanyaBharathi > Field stacks label above the row > Input & Button are both h-9 so they line up-->
    <form @submit.prevent="searchPlace">
      <Field>
        <FieldLabel :for="inputId">Location</FieldLabel>
        <div class="flex gap-2.5">
          <Input :id="inputId" v-model="query" type="search" :placeholder="props.placeholder" />
          <Button type="submit" :disabled="loading || !query.trim()">Search</Button>
          <Button type="button" variant="outline" :disabled="loading" @click="nearMe">Near me</Button>
          <Button v-if="location" type="button" variant="outline" @click="clear">Clear</Button>
        </div>
      </Field>
    </form>

    <!--@ChitanyaBharathi > value-commit > only search again when the thumb is released > not on every drag-->
    <!--@ChitanyaBharathi > greyed out until a location is found > distance means nothing without a starting point-->
    <Field :class="{ 'opacity-50': !location }">
      <FieldLabel>Distance: {{ radius[0] }} km</FieldLabel>
      <Slider v-model="radius" :min="1" :max="20" :step="1" :disabled="loading || !location" @value-commit="changeRadius" />
    </Field>

    <FieldError v-if="error">{{ error }}</FieldError>
    <FieldDescription v-else-if="loading">Finding nearby collection points...</FieldDescription>
    <FieldDescription v-else-if="location">Within {{ radius[0] }} km of {{ location.name }}</FieldDescription>
    <FieldDescription v-else>Search a location or use Near me first</FieldDescription>
  </section>
</template>
