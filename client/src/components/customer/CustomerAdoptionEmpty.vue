<script setup>
import { RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
defineProps({
  emptyCopy: Array,
  emptyPickups: Boolean,
  emptyStageTarget: String,
  emptyStageAction: String,
  searching: Boolean,
  pickupError: String,
  tab: String,
});
const stage = defineModel('stage', { type: String });
const search = defineModel('search', { type: String });
const emit = defineEmits(['refresh']);
</script>
<template>
  <div class="space-y-4 p-8 text-center" :class="{ 'rounded-xl border': !emptyPickups }">
    <h3>{{ emptyCopy[0] }}</h3>
    <p class="text-sm text-muted-foreground">{{ emptyCopy[1] }}</p>
    <template v-if="!emptyPickups">
      <Button v-if="searching" type="button" variant="outline" @click="search = ''"
        >Clear search</Button
      >
      <Button v-else-if="pickupError" type="button" variant="outline" @click="emit('refresh')"
        >Retry pickup information</Button
      >
      <Button
        v-else-if="tab === 'active' && stage !== 'all' && emptyStageTarget"
        type="button"
        variant="outline"
        @click="stage = emptyStageTarget"
        >{{ emptyStageAction }}</Button
      >
      <Button v-else-if="tab === 'active'" asChild
        ><RouterLink :to="{ name: 'customerBooks' }">Browse books</RouterLink></Button
      >
    </template>
  </div>
</template>
