<script setup>
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { displayDate } from '@/lib/adoptions';

defineProps({
  draft: Object,
  confirmed: Boolean,
  appointment: Object,
  saving: Boolean,
  uncertain: Boolean,
  eligible: Boolean,
  submitLabel: String,
});

const emit = defineEmits(['change-field', 'back', 'submit']);
</script>
<template>
  <Badge variant="amber">Not submitted yet</Badge>
  <dl class="space-y-3 text-sm">
    <div
      v-for="field in [
        { key: 'location', label: 'Location', value: draft.location },
        { key: 'appointmentdate', label: 'Date', value: displayDate(draft.appointmentdate) },
        { key: 'timeslot', label: 'Times', value: draft.timeslots.join(' · ') },
      ]"
      :key="field.key"
      class="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-start gap-3 border-b pb-3"
    >
      <dt class="text-muted-foreground">{{ field.label }}</dt>
      <dd class="[overflow-wrap:anywhere]">{{ field.value }}</dd>
      <dd>
        <Button
          v-if="field.key !== 'location'"
          variant="outline"
          type="button"

          :aria-label="`Change ${field.label.toLowerCase()}`"
          :disabled="saving"
          @click="emit('change-field', field.key)"
        >
          Change
        </Button>
      </dd>
    </div>
  </dl>
  <p class="text-xs text-muted-foreground">Singapore time (SGT)</p>
  <section
    v-if="confirmed && appointment"
    class="space-y-1 rounded-lg border p-3 text-sm"
    aria-label="Current confirmed pickup"
  >
    <h3 class="text-xl">Current confirmed pickup</h3>
    <p>{{ displayDate(appointment.appointmentdate) }} · {{ appointment.timeslot }} SGT</p>
    <p class="[overflow-wrap:anywhere]">{{ appointment.location }}</p>
  </section>
  <p class="rounded-lg bg-badge-amber/50 p-3 text-sm">
    {{
      confirmed
        ? 'Sending these changes replaces your current confirmation. Wait until the updated pickup is confirmed before you travel.'
        : 'The team will choose one of your two times and confirm the pickup. Check My Adoptions before travelling.'
    }}
  </p>
  <div class="adoption-actions">
    <Button type="button" variant="outline" :disabled="saving" @click="emit('back')"
      >Edit details</Button
    >
    <Button type="button" :disabled="saving || uncertain || !eligible" @click="emit('submit')">
      {{ saving ? 'Sending…' : submitLabel }}
    </Button>
  </div>
</template>
