<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { computed, ref, watch } from 'vue';
import { api } from '@/lib/api';
import { availablePickupSlot } from '@/lib/pickupTimes';
import { displayDate } from '@/lib/adoptions';
import { Button } from '@/components/ui/button';

const props = defineProps({ disabled: Boolean, appointment: { type: Object, required: true } });
const saving = defineModel('saving', { type: Boolean });
const emit = defineEmits(['updated']);
const selected = ref('');
const sameDate = computed(() => new Set(props.appointment.pickupoptions.map(slot => slot.appointmentdate)).size === 1);
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
  <form class="space-y-4" @submit.prevent="confirmTime">
    <fieldset :disabled="disabled || saving || uncertain" class="space-y-3">
      <legend class="text-sm">Confirm a time · SGT</legend>
      <p class="text-sm text-muted-foreground">choose one of the customer’s available times</p>
      <div class="flex flex-wrap gap-3">
      <label
        v-for="(slot, index) in appointment.pickupoptions"
        :key="index"
        class="flex min-h-11 flex-1 basis-48 items-center gap-3 rounded-lg border px-3 py-2 has-checked:border-success-foreground has-checked:bg-badge-green has-disabled:opacity-50"
      >
        <input
          v-model="selected"
          type="radio"
          name="admin-pickup-time"
          :value="String(index)"
          :disabled="!availablePickupSlot(slot)"
          required
          class="size-4 shrink-0 accent-success-foreground"
        />
        <span
          ><template v-if="!sameDate">{{ displayDate(slot.appointmentdate) }} · </template>{{ slot.timeslot }}
          <span v-if="!availablePickupSlot(slot)"> · time has passed</span>
        </span>
      </label>
      </div>
    </fieldset>
    <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
    <div class="flex gap-3 border-t pt-5">
    <slot name="actions" :disabled="uncertain" />
    <Button v-if="uncertain" class="flex-1" type="button" :disabled="saving" @click="checkStatus"
       :loading="saving"><AppIcon name="refresh" /><span class="sr-only">Check latest status</span></Button
    >
    <Button v-else type="submit" class="flex-1 border-success-foreground text-success-foreground hover:bg-badge-green" title="Confirm selected time" :disabled="disabled || saving || selected === '' || !availablePickupSlot(appointment.pickupoptions[Number(selected)])" :loading="saving"><AppIcon name="success" class="text-success-foreground" /><span class="sr-only">{{
      saving ? 'Confirming…' : 'Confirm selected time'
    }}</span></Button>
    </div>
  </form>
</template>
