<script setup>
import { ref, watch } from 'vue';
import { api } from '@/lib/api';
import { availablePickupSlot } from '@/lib/pickupTimes';
import { displayDate } from '@/lib/adoptions';
import { Button } from '@/components/ui/button';

const props = defineProps({ disabled: Boolean, appointment: { type: Object, required: true } });
const saving = defineModel('saving', { type: Boolean });
const emit = defineEmits(['updated']);
const selected = ref('');
const error = ref('');
const uncertain = ref(false);
watch(
  () => props.appointment.proposalversion,
  () => {
    selected.value = '';
  },
);
async function checkStatus() {
  saving.value = true;
  try {
    const { appointment } = await api(`/admin/appointments/${props.appointment.id}`);
    uncertain.value = false;
    emit('updated', appointment);
    error.value = 'Latest pickup details loaded. Check the status before trying again.';
  } catch (failure) {
    error.value = failure.message;
  } finally {
    saving.value = false;
  }
}
async function confirmTime() {
  if (props.disabled || saving.value || uncertain.value || selected.value === '') return;
  error.value = '';
  const slot = Number(selected.value);
  if (!availablePickupSlot(props.appointment.pickupoptions[slot])) {
    error.value =
      'That time has passed. Choose another time, or reject the request so the customer can send new availability.';
    return;
  }
  saving.value = true;
  try {
    const { appointment } = await api(`/admin/appointments/${props.appointment.id}`, {
      method: 'PATCH',
      body: { proposalversion: props.appointment.proposalversion, slot },
    });
    if (appointment?.status !== 'appointment confirmed')
      throw new Error('Could not verify the confirmation.');
    emit('updated', appointment);
  } catch (failure) {
    uncertain.value = true;
    error.value = `${failure.message} Check the latest status before trying again.`;
    try {
      const { appointment } = await api(`/admin/appointments/${props.appointment.id}`);
      emit('updated', appointment);
    } catch { /* Keep actions locked until an explicit successful status check. */ }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form class="space-y-3 rounded-lg border p-4" @submit.prevent="confirmTime">
    <fieldset :disabled="disabled || saving || uncertain" class="space-y-3">
      <legend class="text-lg">Confirm a time</legend>
      <p class="text-sm text-muted-foreground">
        The customer is available at these three times. Select one to confirm pickup at
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
          name="admin-pickup-time"
          :value="String(index)"
          :disabled="!availablePickupSlot(slot)"
          required
          class="size-4 shrink-0"
        />
        <span
          >{{ displayDate(slot.appointmentdate) }} · {{ slot.timeslot }} SGT
          <span v-if="!availablePickupSlot(slot)"> — time has passed</span>
        </span>
      </label>
    </fieldset>
    <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
    <Button v-if="uncertain" type="button" :disabled="saving" @click="checkStatus"
      >Check latest status</Button
    >
    <Button v-else type="submit" :disabled="disabled || saving || selected === '' || !availablePickupSlot(appointment.pickupoptions[Number(selected)])">{{
      saving ? 'Confirming…' : 'Confirm selected time'
    }}</Button>
    <p class="text-xs text-muted-foreground">
      Reject to request new availability.
    </p>
  </form>
</template>
