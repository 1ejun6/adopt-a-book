<script setup>
import { pickupTimes as timeSlots } from '@/lib/pickupTimes';
import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';

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
          <button
            v-if="key !== 'form'"
            type="button"
            class="text-left underline underline-offset-4"
            @click="emit('focus-field', key)"
          >
            {{ message }}
          </button>
          <span v-else>{{ message }}</span>
        </li>
      </ul>
    </div>
    <Field>
      <FieldLabel for="pickup-location">Preferred pickup location</FieldLabel>
      <Input
        id="pickup-location"
        v-model="draft.location"
        required
        maxlength="300"
        :disabled="saving"
        :aria-invalid="!!errors.location || undefined"
        :aria-describedby="
          errors.location ? 'pickup-location-help pickup-location-error' : 'pickup-location-help'
        "
      />
      <p id="pickup-location-help" class="text-xs text-muted-foreground">
        The collection area is a suggested meeting point. You can suggest a different location.
      </p>
      <p v-if="errors.location" id="pickup-location-error" class="text-xs text-destructive">
        {{ errors.location }}
      </p>
    </Field>
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
        <p v-if="errors.appointmentdate" id="pickup-date-error" class="text-xs text-destructive">
          {{ errors.appointmentdate }}
        </p>
      </Field>
      <Field>
        <FieldLabel for="pickup-timeslot">Preferred time (SGT)</FieldLabel>
        <select
          id="pickup-timeslot"
          v-model="draft.timeslot"
          required
          class="min-h-11 w-full min-w-0 rounded-lg border bg-background px-3 text-base"
          :disabled="saving"
          :aria-invalid="!!errors.timeslot || undefined"
          :aria-describedby="
            errors.timeslot ? 'pickup-time-help pickup-time-error' : 'pickup-time-help'
          "
        >
          <option disabled value="">Choose a time</option>
          <option
            v-if="draft.timeslot && !timeSlots.includes(draft.timeslot)"
            :value="draft.timeslot"
          >
            {{ draft.timeslot }}
          </option>
          <option v-for="time in timeSlots" :key="time" :value="time">{{ time }}</option>
        </select>
        <p id="pickup-time-help" class="text-xs text-muted-foreground">
          Choose a preferred time. Wait for the team to confirm before travelling.
        </p>
        <p v-if="errors.timeslot" id="pickup-time-error" class="text-xs text-destructive">
          {{ errors.timeslot }}
        </p>
      </Field>
    </div>
    <p class="text-xs text-muted-foreground">All times are in Singapore time (SGT).</p>
    <div class="adoption-actions">
      <Button
        type="button"
        variant="outline"
        class="flex-1"
        :disabled="saving"
        @click="emit('back')"
        >Back</Button
      >
      <Button type="submit" class="flex-1" :disabled="saving || uncertain || !eligible">
        Review pickup request
      </Button>
    </div>
  </form>
</template>
