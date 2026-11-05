<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { api } from '@/lib/api';
import AdminTabs from './AdminTabs.vue';
import AdminTable from './AdminTable.vue';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import AppPagination from '@/components/shared/AppPagination.vue';
import { Button } from '@/components/ui/button';

const props = defineProps({ open: Boolean, stationId: String, drive: Object, disabled: Boolean, revision: Number });
const selected = defineModel({ type: Array, default: () => [] });
const emit = defineEmits(['valid']);
const mode = ref('select'), page = ref(1), rows = ref([]), loading = ref(false), error = ref('');
const pageSize = 10;
let generation = 0, controller;
const columns = computed(() => [{ key: 'book', label: 'Book' }, { key: 'status', label: 'Status', class: 'w-36' }, ...(mode.value === 'review' ? [{ key: 'remove', label: '', class: 'w-24' }] : [])]);
const selectedBooks = computed(() => selected.value.map(id => rows.value.find(book => book.id === id) || { id, title: 'Book no longer exists', status: 'unavailable' }));
const invalid = computed(() => selectedBooks.value.some(book => book.status !== 'available' || book.mrtstationid !== props.stationId));
const filtered = computed(() => (mode.value === 'review' ? selectedBooks.value : rows.value.filter(book => book.status === 'available' && book.mrtstationid === props.stationId)));
const visibleRows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
watch(mode, () => { page.value = 1; });
watch(() => filtered.value.length, () => { page.value = Math.min(page.value, Math.max(1, Math.ceil(filtered.value.length / pageSize))); });
watch([loading, error, invalid, () => selected.value.length], () => emit('valid', !loading.value && !error.value && !invalid.value && selected.value.length > 0), { immediate: true });
function cancel() { generation++; controller?.abort(); loading.value = false; }
onBeforeUnmount(cancel);
async function load() {
  cancel(); const id = generation;
  error.value = '';
  if (!props.open || !props.stationId) { rows.value = []; return; }
  controller = new AbortController(); const signal = controller.signal;
  loading.value = true;
  try {
    // Keep saved copies in review, including ones no longer available at this station.
    const saved = props.drive?.id ? (await api(`/drives/${props.drive.id}/books`, { signal })).books : [];
    const available = [];
    let response, bookPage = 1;
    do {
      response = await api('/books', { signal, query: { mrtstationids: props.stationId, status: 'available', page: bookPage++, limit: 100 } });
      if (id !== generation) return;
      available.push(...response.books);
    } while (response.books.length && available.length < response.total);
    if (id !== generation) return;
    rows.value = [...new Map([...saved, ...available].map(book => [book.id, book])).values()];
  } catch (failure) { if (id === generation) error.value = failure.message; }
  finally { if (id === generation) loading.value = false; }
}
watch(() => props.revision, () => { if (props.open) void load(); });
watch(() => [props.open, props.stationId, props.drive?.id], ([open, station, drive], previous = []) => {
  if (open && previous[0] && drive === previous[2] && station !== previous[1]) selected.value = [];
  mode.value = 'select'; page.value = 1;
  rows.value = props.drive?.books || [];
  void load();
}, { immediate: true });
</script>

<template>
  <section class="space-y-3" aria-labelledby="drive-book-selection-title" :aria-busy="loading">
    <h3 id="drive-book-selection-title">Books for this drive <span aria-hidden="true">*</span></h3>
    <p v-if="!stationId" class="text-sm text-muted-foreground">Choose an address or MRT station to see available books.</p>
    <template v-else>
      <AdminTabs v-model="mode" :tabs="[{ value: 'select', label: 'Select books' }, { value: 'review', label: `Review selected ${selected.length}` }]" label="Drive book selection" :disabled="disabled" />
      <p class="text-sm" aria-live="polite">{{ selected.length }} selected</p>
      <p v-if="invalid" role="alert" class="text-sm text-destructive">Some selected copies are unavailable or belong to another MRT. Remove them in Review selected.</p>
      <div v-if="error" role="alert" class="space-y-2"><p>{{ error }}</p><Button type="button" variant="outline" :disabled="disabled" @click="load">Retry books</Button></div>
      <AdminTable v-else :rows="visibleRows" :columns="columns" :selectedIds="selected" :selectable="mode === 'select'" :selectionColumn="mode === 'select'"
        :rowAction="mode === 'select' ? 'select' : 'none'" :isLoading="loading" :disabled="disabled || loading"
        :emptyTitle="mode === 'review' ? 'No selected books' : 'No available books found'" emptyDescription="Choose available books at this MRT station."
        @selectedRows="selected = $event">
        <template #cellBook="{ row }"><BookIdentity :title="row.title" :author="row.authors?.join(', ')" :cover="row.coverurl" /></template>
        <template #cellStatus="{ row }"><StatusBadge :status="row.status" /><p v-if="row.mrtstationid !== stationId" class="text-sm text-destructive">Not at this MRT</p></template>
        <template #cellRemove="{ row }"><Button type="button" variant="outline" :disabled="disabled" :aria-label="`Remove ${row.title}`" @click="selected = selected.filter(id => id !== row.id)">Remove</Button></template>
      </AdminTable>
      <AppPagination v-if="!error && filtered.length" v-model:page="page" :total="filtered.length" :pageSize="pageSize" itemLabel="books" :disabled="disabled || loading" />
    </template>
  </section>
</template>
