<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { Button } from '@/components/ui/button';
import { computed } from 'vue';
import { pickupTimeText } from '@/lib/pickupTimes';
import { displayDate, pickupStatus, recordId } from '@/lib/adoptions';

const props = defineProps({
  record: { type: Object, default: null },
  appointment: { type: Object, default: null },
});
const emit = defineEmits(['pickup-record']);
const attempts = computed(() =>
  (props.record?.pickups || []).filter((item) => recordId(item) !== recordId(props.appointment)),
);
</script>

<template>
  <section v-if="attempts.length" class="space-y-3 border-b pb-5 text-sm" aria-label="Previous pickup attempts">
    <h3 class="font-body text-sm font-semibold">Previous pickup attempts ({{ attempts.length }})</h3>
      <ol class="divide-y" aria-label="Previous pickup attempts">
        <li v-for="attempt in attempts" :key="recordId(attempt)" class="space-y-1 py-3">
          <p>{{ pickupStatus(attempt).label }}</p>
          <p>
            {{ displayDate(attempt.appointmentdate) }} ·
            {{ pickupTimeText(attempt) }} SGT
          </p>
          <p>{{ attempt.location || 'Location unavailable' }}</p>
          <Button variant="outline"
            type="button"
            class="min-h-11 "
            :aria-label="`View pickup record ${recordId(attempt)}`"
            @click="emit('pickup-record', attempt)"
          ><AppIcon name="request" />
            View pickup record
          </Button>
        </li>
      </ol>
  </section>
</template>
