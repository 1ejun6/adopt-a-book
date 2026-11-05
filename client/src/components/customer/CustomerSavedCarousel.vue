<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { ArrowLeft01Icon, ArrowRight01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { RouterLink } from 'vue-router';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
const props = defineProps({
  entries: { type: Array, default: () => [] },
  busyIds: { type: Set, default: () => new Set() },
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
        <button
          class="preview"
          type="button"
          aria-haspopup="dialog"
          @click="$emit('select', entry.bookid)"
        >
          <AppBookIdentity
            :title="entry.bookid.title"
            :author="(entry.bookid.authors || []).join(', ')"
            :cover="entry.bookid.thumbnailurl || entry.bookid.coverurl"
            cover-class="h-36 w-full"
            vertical
            wrap
          />
          <span class="metadata">
            <span class="availability">{{
              entry.bookid.status === 'available'
                ? 'Available to request'
                : 'Unavailable for new requests'
            }}</span>
            <span class="collection" :title="entry.bookid.collectionarea || entry.bookid.mrtstation?.name || 'Not provided'">Collection: {{ entry.bookid.collectionarea || entry.bookid.mrtstation?.name || 'Not provided' }}</span>
          </span>
        </button>
        <div class="actions">
          <Button v-if="props.requestIds.get(entry.bookid.id)" asChild variant="outline" size="sm" class="flex-1 whitespace-nowrap">
            <RouterLink :to="{ name: 'customerAdoptions', query: { request: props.requestIds.get(entry.bookid.id) } }">View my request<span class="sr-only"> for {{ entry.bookid.title }}</span></RouterLink>
          </Button>
          <Button
            variant="outline"
            :class="[props.requestIds.get(entry.bookid.id) ? 'px-0' : 'w-full', 'text-destructive']"
            :disabled="busyIds.has(entry.bookid.id)"
            :aria-label="`Remove ${entry.bookid.title} from saved books`"
            @click="$emit('remove', entry.bookid)"
          >
            <HugeiconsIcon :icon="Delete02Icon" class="size-4" aria-hidden="true" />
            <span v-if="!props.requestIds.get(entry.bookid.id)">Remove</span>
          </Button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.header {
  display: flex;
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
  padding: 0.5rem 0.25rem 1rem;
}
.saved-book {
  flex: 0 0 13.5rem;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.preview {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
}
.metadata {
  margin-top: auto;
  display: grid;
  gap: 0.25rem;
  font-size: 0.75rem;
}
.collection {
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
