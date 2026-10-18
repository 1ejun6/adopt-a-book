<script setup>
// search + genre dropdown + near me toggle in one row > parent owns the values through v-model
import { Search01Icon, Location01Icon } from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';

defineProps({
  genres: { type: Array, required: true },
  locating: { type: Boolean, default: false },
});

const search = defineModel('search', { default: '' });
const genre = defineModel('genre', { default: 'All' });
const nearMe = defineModel('nearMe', { default: false });
</script>

<template>
  <div class="flex items-center gap-2">
    <label class="relative max-w-md min-w-0 flex-1">
      <span class="sr-only">Search books</span>
      <HugeiconsIcon :icon="Search01Icon" class="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input v-model="search" type="search" placeholder="Search title or author..." class="h-14 rounded-full pl-12 text-lg" />
    </label>

    <label class="shrink-0">
      <span class="sr-only">Genre</span>
      <select v-model="genre" class="h-14 rounded-full border border-foreground bg-transparent px-5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <option value="All">All genres</option>
        <option v-for="option in genres" :key="option" :value="option">{{ option }}</option>
      </select>
    </label>

    <button type="button" :aria-pressed="nearMe" :disabled="locating"
      :class="nearMe ? 'border-foreground bg-primary' : 'border-border hover:bg-accent'"
      class="flex h-14 shrink-0 items-center gap-2 rounded-full border px-5 text-sm disabled:opacity-50" @click="nearMe = !nearMe">
      <HugeiconsIcon :icon="Location01Icon" class="size-4" aria-hidden="true" />
      {{ locating ? 'Finding...' : 'Near me' }}
    </button>
  </div>
</template>
