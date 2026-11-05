<script setup>
import { pickupTimeText } from '@/lib/pickupTimes';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { api } from '@/lib/api';
import {
  collectionLocation,
  displayDate,
  getApplicationDate,
  pickupStatus,
  recordId,
} from '@/lib/adoptions';
import { Button } from '@/components/ui/button';

const props = defineProps({
  record: { type: Object, default: null },
  appointment: { type: Object, default: null },
});
const emit = defineEmits(['pickup-record']);
const book = ref(null);
const loading = ref(false);
const error = ref('');
let controller;
watch(
  () => props.record?.bookId,
  () => {
    controller?.abort();
    book.value = null;
    error.value = '';
    loading.value = false;
  },
);
onBeforeUnmount(() => controller?.abort());
async function loadBook() {
  if (!props.record?.bookId || book.value || loading.value) return;
  const request = new AbortController();
  controller = request;
  loading.value = true;
  error.value = '';
  try {
    const response = await api(`/books/${props.record.bookId}`, {
      method: 'GET',
      signal: request.signal,
    });
    if (!response.book || recordId(response.book) !== props.record.bookId)
      throw new Error('Book details unavailable');
    if (!request.signal.aborted) book.value = response.book;
  } catch {
    if (!request.signal.aborted) error.value = 'We couldn’t load the book description.';
  } finally {
    if (!request.signal.aborted) loading.value = false;
  }
}
const description = computed(() =>
  String(book.value?.description || '')
    .replace(/<[^>]*>/g, '')
    .trim(),
);
const attempts = computed(() =>
  (props.record?.pickups || []).filter((item) => recordId(item) !== recordId(props.appointment)),
);
</script>

<template>
  <div class="space-y-3 border-t text-sm">
    <details
      v-if="record"
      @toggle="
        (event) => {
          if (event.target.open) loadBook();
        }
      "
    >
      <summary class="min-h-11 cursor-pointer py-3 underline underline-offset-4">
        Book and request information
      </summary>
      <div class="space-y-4 pb-3">
        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
          <dt class="text-muted-foreground">Condition</dt>
          <dd>{{ record.book?.condition || 'Not listed' }}</dd>
          <dt class="text-muted-foreground">Collection area</dt>
          <dd>{{ collectionLocation(record.book) || 'Not listed' }}</dd>
          <dt class="text-muted-foreground">Requested on</dt>
          <dd>{{ displayDate(getApplicationDate(record.application)) }}</dd>
          <dt class="text-muted-foreground">Request reference</dt>
          <dd class="[overflow-wrap:anywhere]">{{ record.id || 'Unavailable' }}</dd>
        </dl>
        <p class="text-xs text-muted-foreground">
          The collection area is a suggested meeting point. Wait for a confirmed pickup location
          before travelling.
        </p>
        <div :aria-busy="loading">
          <h3 class="font-body text-sm font-semibold">Book description</h3>
          <p v-if="loading" role="status">Loading book description…</p>
          <template v-else-if="error">
            <p role="alert">{{ error }}</p>
            <Button type="button" variant="outline" class="mt-2" @click="loadBook"
              >Retry book information</Button
            >
          </template>
          <p v-else class="whitespace-pre-line text-muted-foreground">
            {{ description || 'No description available.' }}
          </p>
        </div>
      </div>
    </details>
    <details v-if="appointment">
      <summary class="min-h-11 cursor-pointer py-3 underline underline-offset-4">
        Pickup reference
      </summary>
      <p class="pb-3 [overflow-wrap:anywhere]">
        {{ recordId(appointment) || 'Unavailable' }} · Created
        {{ displayDate(appointment.createdat) }}
      </p>
    </details>
    <details v-if="attempts.length">
      <summary class="min-h-11 cursor-pointer py-3 underline underline-offset-4">
        Previous pickup attempts ({{ attempts.length }})
      </summary>
      <ol class="divide-y" aria-label="Previous pickup attempts">
        <li v-for="attempt in attempts" :key="recordId(attempt)" class="space-y-1 py-3">
          <p>{{ pickupStatus(attempt).label }}</p>
          <p>
            {{ displayDate(attempt.appointmentdate) }} ·
            {{ pickupTimeText(attempt) }} SGT
          </p>
          <p>{{ attempt.location || 'Location unavailable' }}</p>
          <button
            type="button"
            class="min-h-11 underline underline-offset-4"
            :aria-label="`View pickup record ${recordId(attempt)}`"
            @click="emit('pickup-record', attempt)"
          >
            View pickup record
          </button>
        </li>
      </ol>
    </details>
  </div>
</template>
