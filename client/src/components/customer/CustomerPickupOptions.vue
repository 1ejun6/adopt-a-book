<script setup>
import { displayDate } from '@/lib/adoptions';
import { availablePickupSlot } from '@/lib/pickupTimes';
import { Button } from '@/components/ui/button';
defineProps({ appointment: Object, disabled: Boolean });
const selected = defineModel({ type: String, default: '' });
const emit = defineEmits(['accept']);
</script>

<template>
  <form class="space-y-3 rounded-lg border p-4" @submit.prevent="emit('accept')">
    <fieldset :disabled="disabled" class="space-y-3">
      <legend class="text-lg">Choose your pickup time</legend>
      <p class="text-sm">
        The team is available at these times. Choose one to confirm your pickup at
        {{ appointment.location }}.
      </p>
      <label
        v-for="(slot, index) in appointment.pickupoptions"
        :key="index"
        class="flex min-h-11 items-center gap-3 rounded-lg border p-3"
      >
        <input
          v-model="selected"
          type="radio"
          name="pickup-option"
          :value="String(index)"
          :disabled="!availablePickupSlot(slot)"
          required
          class="size-4 shrink-0"
        />
        <span
          >{{ displayDate(slot.appointmentdate) }} · {{ slot.timeslot }} SGT
          <span v-if="!availablePickupSlot(slot)"> — no longer available</span>
        </span>
      </label>
      <Button
        type="submit"
        :disabled="
          disabled ||
          selected === '' ||
          !availablePickupSlot(appointment.pickupoptions[Number(selected)])
        "
        >Confirm selected time</Button
      >
    </fieldset>
    <p class="text-sm text-muted-foreground">
      None of these work? Use “Edit pickup request” below to suggest another time.
    </p>
  </form>
</template>
