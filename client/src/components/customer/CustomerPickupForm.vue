<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { computed } from 'vue';
import { pickupTimes as timeSlots, availablePickupSlot, availablePickupTimes } from '@/lib/pickupTimes';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

defineProps({
  ready: Boolean,
  eligible: Boolean,
  saving: Boolean,
  uncertain: Boolean,
  errorEntries: Array,
  errors: Object,
  today: String,
});
const draft = defineModel('draft', { type: Object, required: true });
const insufficientTimes = computed(() => !!draft.value.appointmentdate && availablePickupTimes(draft.value.appointmentdate).length < 2);
const emit = defineEmits(['review', 'focus-field', 'back', 'summary-ref']);
</script>
<template>
  <p v-if="ready && !eligible" class="text-sm text-destructive" role="alert">
    This request can no longer be changed. Close and refresh to check its latest status.
  </p>
  <form class="space-y-4" novalidate :aria-busy="saving" @submit.prevent="emit('review')">
    <div
      v-if="errorEntries.length"
      :ref="(node) => emit('summary-ref', node)"
      tabindex="-1"
      class="space-y-2 rounded-lg border-2 border-destructive p-3"
      role="alert"
    >
      <h3 class="text-xl">Check your pickup details</h3>
      <ul class="space-y-2 text-sm">
        <li v-for="[key, message] in errorEntries" :key="key">
          <Button variant="outline"
            v-if="key !== 'form'"
            type="button"
            class="text-left "
            @click="emit('focus-field', key)"
          >
            {{ message }}
          </Button>
          <span v-else>{{ message }}</span>
        </li>
      </ul>
    </div>
    <div class="space-y-1">
      <p class="text-sm font-semibold">Pickup MRT station</p>
      <p id="pickup-location" class="text-sm">{{ draft.location || 'Station unavailable' }}</p>
      <p v-if="errors.location" role="alert" class="text-sm text-destructive">{{ errors.location }}</p>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel for="pickup-appointmentdate">Preferred date</FieldLabel>
        <Input
          id="pickup-appointmentdate"
          v-model="draft.appointmentdate"
          type="date"
          :min="today"
          required
          :disabled="saving"
          :aria-invalid="!!errors.appointmentdate || undefined"
          :aria-describedby="errors.appointmentdate ? 'pickup-date-error' : undefined"
        />
        <p v-if="errors.appointmentdate" id="pickup-date-error" class="text-sm text-destructive">
          {{ errors.appointmentdate }}
        </p>
      </Field>
      <fieldset class="space-y-2" :disabled="saving" aria-describedby="pickup-time-help">
        <legend class="text-sm">Two times you’re available (SGT)</legend>
        <p id="pickup-time-help" class="text-sm text-muted-foreground">
          choose two different times on the same date. the team will confirm one.
        </p>
        <div v-for="index in [0, 1]" :key="index" class="space-y-1">
          <label :for="index === 0 ? 'pickup-timeslot' : `pickup-timeslot-${index}`" class="text-sm"
            >Time {{ index + 1 }}</label
          >
          <Select v-model="draft.timeslots[index]" :disabled="saving || !draft.appointmentdate">
            <SelectTrigger :id="index === 0 ? 'pickup-timeslot' : `pickup-timeslot-${index}`"
              :aria-invalid="!!errors.timeslot || undefined"
              :aria-describedby="errors.timeslot ? 'pickup-time-help pickup-time-error' : 'pickup-time-help'">
              <SelectValue placeholder="Choose a time" />
            </SelectTrigger>
            <SelectContent>
            <SelectItem
              v-for="time in timeSlots"
              :key="time"
              :value="time"
              :disabled="
                (draft.timeslots.includes(time) && draft.timeslots[index] !== time) ||
                !availablePickupSlot({ appointmentdate: draft.appointmentdate, timeslot: time })
              "
            >
              {{ time }}
            </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p v-if="errors.timeslot" id="pickup-time-error" class="text-sm text-destructive">
          {{ errors.timeslot }}
        </p>
      </fieldset>
    </div>
    <p class="text-sm text-muted-foreground">all times are in singapore time (sgt).</p>
    <div class="adoption-actions">
      <Button
        type="button"
        variant="outline"
        class="flex-1"
        :disabled="saving"
        @click="emit('back')"
        ><AppIcon name="back" />Back</Button
      >
      <Button type="submit" class="flex-1" :disabled="saving || uncertain || !eligible || insufficientTimes"><AppIcon name="next" />
        Review pickup request
      </Button>
    </div>
  </form>
</template>
