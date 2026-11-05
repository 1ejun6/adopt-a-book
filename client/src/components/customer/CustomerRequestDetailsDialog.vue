<script setup>
import { pickupTimeText } from '@/lib/pickupTimes';
import { computed, nextTick, ref, watch, watchEffect } from 'vue';
import { useAdoptionsStore } from '@/stores/adoptions';
const adoptions = useAdoptionsStore();
import { formatDate } from '@/lib/utils';
import CustomerAdoptionInformation from './CustomerAdoptionInformation.vue';
import { Button } from '@/components/ui/button';
const props = defineProps({
  record: { type: Object, default: null },
  ready: { type: Boolean, default: true },
  reconcile: { type: Function, required: true },
  complete: { type: Function, required: true },
});
const open = defineModel('open', { type: Boolean, default: false });
const emit = defineEmits(['pickup', 'pickup-record', 'state', 'focus-heading', 'history']);
const currentPickup = computed(() =>
  ['pickup requested', 'pickup confirmed', 'collected'].includes(props.record?.code)
    ? props.record.appointment
    : null,
);
const waitingPickup = computed(() => props.record?.code === 'pickup requested');
const pickupHeading = computed(() => {
  if (props.record?.code === 'collected') return 'Pickup details';
  if (waitingPickup.value) return 'Requested pickup';
  return 'Confirmed pickup';
});
const confirming = ref(false);
const saving = ref(false);
const error = ref('');
const uncertain = ref(false);
const withdrawn = ref(false);
const refreshWarning = ref('');
const errorNode = ref(null);
watch(open, () => {
  confirming.value = false;
  error.value = '';
  uncertain.value = false;
  withdrawn.value = false;
  refreshWarning.value = '';
  if (open.value) nextTick(() => emit('focus-heading'));
});
watch(error, async (value) => {
  if (value) {
    await nextTick();
    errorNode.value?.focus();
  }
});
async function finishWithdrawal(reload = true) {
  withdrawn.value = true;
  uncertain.value = false;
  confirming.value = false;
  error.value = '';
  try {
    const ready = await props.complete(props.record.id, reload);
    refreshWarning.value = ready
      ? ''
      : 'Your change was saved, but we couldn’t refresh the list. Check updates before making another change.';
  } catch {
    refreshWarning.value = 'Your request was withdrawn, but we couldn’t refresh the list.';
  }
  await nextTick();
  emit('focus-heading');
}
async function checkStatus() {
  saving.value = true;
  try {
    const ready = await props.reconcile();
    if (!ready) throw new Error('status unavailable');
    if (props.record?.code === 'withdrawn') {
      await finishWithdrawal(false);
    } else if (props.record?.canWithdraw) {
      uncertain.value = false;
      error.value = 'Your change was not saved. You can try again.';
    } else {
      error.value = 'This adoption has changed. Review its latest status before continuing.';
    }
  } catch {
    error.value =
      'We couldn’t check whether your change was saved. Check the latest status before sending it again.';
  } finally {
    saving.value = false;
  }
}
async function withdraw() {
  if (saving.value || uncertain.value || !props.ready || !props.record?.canWithdraw) return;
  saving.value = true;
  error.value = '';
  try {
    await adoptions.withdrawApplication(props.record.id);
    await finishWithdrawal(false);
  } catch {
    uncertain.value = true;
    await checkStatus();
  } finally {
    saving.value = false;
  }
}
function canNavigate() {
  if (open.value && saving.value) return false;
  open.value = false;
  return true;
}
defineExpose({ canNavigate, updateOpen });
function updateOpen(value) {
  if (!saving.value) {
    open.value = value;
  }
}
watchEffect(() => {
  emit('state', {
    title: withdrawn.value
      ? 'Request withdrawn'
      : confirming.value
        ? 'Withdraw this request?'
        : 'Adoption details',
    saving: saving.value,
    flowVisible: !withdrawn.value && !confirming.value,
  });
});
</script>

<template>
  <div v-if="record" class="space-y-5">
    <p v-if="error" ref="errorNode" tabindex="-1" role="alert" class="text-sm text-destructive">
      {{ error }}
    </p>
    <Button v-if="uncertain" type="button" variant="outline" :disabled="saving" @click="checkStatus">Check status
      again</Button>
    <p v-if="refreshWarning" role="status" class="text-sm">{{ refreshWarning }}</p>
    <section v-if="withdrawn" class="space-y-4" role="status">
      <p>Your request has been withdrawn and moved to History.</p>
      <Button type="button" :disabled="saving" @click="emit('history')">View in History</Button>
    </section>
    <section v-else-if="confirming" class="space-y-3 rounded-lg bg-badge-rose/40 p-4" aria-label="Confirm withdrawal">
      <p class="text-sm">You can request this book again if it is still available.</p>
      <div class="adoption-actions">
        <Button type="button" variant="destructive" :disabled="saving || uncertain || !ready || !record.canWithdraw"
          @click="withdraw">{{ saving ? 'Withdrawing…' : 'Withdraw request' }}</Button>
        <Button type="button" variant="outline" :disabled="saving" @click="confirming = false">Keep request</Button>
      </div>
    </section>
    <template v-else>
      <section v-if="currentPickup" class="space-y-3 text-sm" aria-label="Current pickup details">
        <h3 class="font-body text-sm font-semibold">{{ pickupHeading }}</h3>
        <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
          <dt class="text-muted-foreground">Date</dt>
          <dd>
            {{
              Number.isFinite(Date.parse(currentPickup.appointmentdate))
                ? formatDate(currentPickup.appointmentdate, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
                : 'Date unavailable'
            }}
          </dd>
          <dt class="text-muted-foreground">Time</dt>
          <dd class="[overflow-wrap:anywhere]">
            {{ pickupTimeText(currentPickup) }} SGT
          </dd>
          <dt class="text-muted-foreground">Location</dt>
          <dd class="[overflow-wrap:anywhere]">
            {{ currentPickup.location || 'Location unavailable' }}
          </dd>
        </dl>
      </section>
      <CustomerAdoptionInformation :record="record" :appointment="currentPickup"
        @pickup-record="emit('pickup-record', $event)" />
      <div class="adoption-actions">
        <Button type="button" variant="outline" :disabled="saving" @click="open = false">Back to my adoptions</Button>
        <Button v-if="record.action" :disabled="!ready || saving" type="button" @click="emit('pickup', record)">{{
          record.actionLabel }}</Button>
      </div>
      <button v-if="record.canWithdraw && !uncertain" :disabled="!ready || saving" type="button"
        class="min-h-11 text-sm text-destructive underline underline-offset-4" @click="confirming = true">
        Withdraw request
      </button>
    </template>
  </div>
</template>
