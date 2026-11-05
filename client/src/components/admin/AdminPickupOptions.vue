<script setup>
import { ref, watch } from 'vue';
import { api } from '@/lib/api';
import { pickupTimes, availablePickupSlot } from '@/lib/pickupTimes';
import { todayInSingapore } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const props = defineProps({ appointment: { type: Object, required: true } });
const saving = defineModel('saving', { type: Boolean });
const emit = defineEmits(['updated']);
const options = ref([]);
const error = ref('');
const uncertain = ref(false);
watch(
  () => [props.appointment.id, props.appointment.updatedat],
  () => {
    options.value = Array.from({ length: 3 }, (_, i) => ({
      appointmentdate:
        props.appointment.pickupoptions?.[i]?.appointmentdate ||
        (props.appointment.appointmentdate >= todayInSingapore()
          ? props.appointment.appointmentdate
          : ''),
      timeslot: props.appointment.pickupoptions?.[i]?.timeslot || '',
    }));
  },
  { immediate: true },
);
async function checkStatus() {
  saving.value = true;
  try {
    const { appointment } = await api(`/admin/appointments/${props.appointment.id}`);
    uncertain.value = false;
    emit('updated', appointment);
    error.value =
      'Latest pickup details loaded. Check the choices below before making another change.';
  } catch (failure) {
    error.value = failure.message;
  } finally {
    saving.value = false;
  }
}
async function suggest() {
  if (saving.value || uncertain.value) return;
  error.value = '';
  if (!options.value.every(availablePickupSlot)) {
    error.value = 'Choose three future dates and hourly time slots.';
    return;
  }
  if (new Set(options.value.map((slot) => `${slot.appointmentdate}|${slot.timeslot}`)).size !== 3) {
    error.value = 'Choose three different pickup slots.';
    return;
  }
  saving.value = true;
  try {
    const { appointment } = await api(`/admin/appointments/${props.appointment.id}`, {
      method: 'PATCH',
      body: { pickupoptions: options.value, expectedupdatedat: props.appointment.updatedat },
    });
    if (!appointment?.id) throw new Error('Could not verify the saved choices.');
    emit('updated', appointment);
  } catch (failure) {
    uncertain.value = true;
    error.value = `${failure.message} Check the latest status before sending again.`;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form class="space-y-3 rounded-lg border p-4" @submit.prevent="suggest">
    <h3>Suggest three pickup times</h3>
    <p class="text-sm text-muted-foreground">
      Offer three times you’re available at {{ appointment.location }}. The customer chooses one to
      confirm the pickup. Sending new choices replaces any previous choices or confirmed time.
    </p>
    <fieldset
      v-for="(slot, index) in options"
      :key="index"
      :disabled="saving || uncertain"
      class="space-y-2"
    >
      <legend class="text-sm">Option {{ index + 1 }}</legend>
      <div class="grid gap-2 sm:grid-cols-2">
        <div class="space-y-1">
          <label :for="`offer-date-${index}`" class="text-sm">Date {{ index + 1 }}</label>
          <Input
            :id="`offer-date-${index}`"
            v-model="slot.appointmentdate"
            type="date"
            :min="todayInSingapore()"
            required
          />
        </div>
        <div class="space-y-1">
          <label :for="`offer-time-${index}`" class="text-sm">Time {{ index + 1 }} (SGT)</label>
          <select
            :id="`offer-time-${index}`"
            v-model="slot.timeslot"
            required
            class="min-h-11 w-full rounded-lg border bg-background px-3"
          >
            <option disabled value="">Choose a time</option>
            <option
              v-for="time in pickupTimes"
              :key="time"
              :value="time"
              :disabled="
                !availablePickupSlot({ appointmentdate: slot.appointmentdate, timeslot: time })
              "
            >
              {{ time }}
            </option>
          </select>
        </div>
      </div>
    </fieldset>
    <p v-if="appointment.pickupoptions?.length" class="text-sm" role="status">
      Waiting for the customer to choose a time.
    </p>
    <p v-if="error" class="text-sm text-destructive" role="alert">{{ error }}</p>
    <Button v-if="uncertain" type="button" :disabled="saving" @click="checkStatus"
      >Check latest status</Button
    >
    <Button v-else type="submit" :disabled="saving">{{
      saving ? 'Sending…' : 'Send three options'
    }}</Button>
  </form>
</template>
