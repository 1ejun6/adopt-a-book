<script setup>
import CustomerBookAvailability from '@/components/customer/CustomerBookAvailability.vue';
import CustomerSavedBookCard from '@/components/customer/CustomerSavedBookCard.vue';
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
const props = defineProps({
  entries: { type: Array, default: () => [] },
  busyIds: { type: Set, default: () => new Set() },
  savingIds: { type: Set, default: () => new Set() },
  requestIds: { type: Map, default: () => new Map() },
});
defineEmits(['select', 'remove']);
const track = ref(null),
  atStart = ref(true),
  atEnd = ref(true);
let observer;
function update() {
  const el = track.value;
  if (!el) return;
  atStart.value = el.scrollLeft <= 1;
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
}
function move(direction) {
  track.value?.scrollBy({
    left: direction * track.value.clientWidth * 0.8,
    behavior: 'instant',
  });
}
watch(
  () => props.entries.map((entry) => entry.id),
  async () => {
    await nextTick();
    update();
  },
);
onMounted(() => {
  observer = new ResizeObserver(update);
  observer.observe(track.value);
  update();
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div class="saved-carousel">
    <div class="header">
      <slot name="heading" />
      <div class="controls">
        <Button
          variant="outline"
          aria-label="Previous saved books"
          aria-controls="saved-track"
          :disabled="atStart"
          @click="move(-1)"
          ><HugeiconsIcon :icon="ArrowLeft01Icon" class="size-4" aria-hidden="true" /></Button
        >
        <Button
          variant="outline"
          aria-label="Next saved books"
          aria-controls="saved-track"
          :disabled="atEnd"
          @click="move(1)"
          ><HugeiconsIcon :icon="ArrowRight01Icon" class="size-4" aria-hidden="true" /></Button
        >
      </div>
    </div>
    <ul
      id="saved-track"
      ref="track"
      class="track"
      aria-label="Saved books"
      @scroll.passive="update"
    >
      <li v-for="entry in entries" :key="entry.id" class="saved-book">
        <CustomerSavedBookCard :book="entry.bookid" :busy="busyIds.has(entry.bookid.id)"
          :saving="savingIds.has(entry.bookid.id)" :requestId="props.requestIds.get(entry.bookid.id)"
          @preview="$emit('select', $event)" @remove="$emit('remove', $event)" />
      </li>
    </ul>
    <CustomerBookAvailability legend class="mt-2.5" />
  </div>
</template>

<style scoped>
.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}
.controls {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}
.track {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding: 0.25rem 0.25rem 1rem;
  scroll-snap-type: x proximity;
}
.saved-book {
  flex: 0 0 13.5rem;
  min-width: 0;
  scroll-snap-align: start;
}

</style>
