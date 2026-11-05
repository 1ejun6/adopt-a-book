<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppBookIdentity from './AppBookIdentity.vue';
import AppStatusBadge from './AppStatusBadge.vue';
const props = defineProps({ driveId: { type: String, required: true } });
const books = ref([]), loading = ref(false), error = ref(''), search = ref('');
let generation = 0, controller;
function cancel() { generation++; controller?.abort(); loading.value = false; }
onBeforeUnmount(cancel);
const filtered = computed(() => books.value.filter(book => `${book.title} ${(book.authors || []).join(' ')}`.toLowerCase().includes(search.value.trim().toLowerCase())));
async function load() {
  cancel(); const id = generation;
  books.value = []; error.value = '';
  if (!props.driveId) return;
  controller = new AbortController(); loading.value = true;
  try {
    const result = await api(`/drives/${props.driveId}/books`, { signal: controller.signal });
    if (id === generation) books.value = result.books;
  } catch (failure) { if (id === generation) error.value = failure.message; }
  finally { if (id === generation) loading.value = false; }
}
watch(() => props.driveId, () => { search.value = ''; void load(); }, { immediate: true });
</script>

<template>
  <section class="space-y-3 border-b pb-4" aria-label="Books selected for this drive" :aria-busy="loading">
    <h3>Book list</h3>
    <Input v-if="books.length" v-model="search" type="search" placeholder="Search by title or author…" aria-label="Search selected drive books" />
    <p v-if="loading" role="status" class="text-sm">Loading selected books…</p>
    <div v-else-if="error" role="alert" class="space-y-2"><p>{{ error }}</p><Button type="button" variant="outline" @click="load">Retry book list</Button></div>
    <p v-else-if="!books.length" class="text-sm text-muted-foreground">No books selected yet.</p>
    <p v-else-if="!filtered.length" class="text-sm">No matching books.</p>
    <ul v-else class="max-h-80 space-y-3 overflow-y-auto" tabindex="0" aria-label="Selected books">
      <li v-for="book in filtered" :key="book.id" class="flex items-start justify-between gap-3">
        <AppBookIdentity :title="book.title" :author="book.authors?.join(', ')" :cover="book.coverurl" />
        <AppStatusBadge :status="book.status" />
      </li>
    </ul>
  </section>
</template>
