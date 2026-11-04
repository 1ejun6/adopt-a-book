<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import CustomerAdoptionProgress from '@/components/customer/CustomerAdoptionProgress.vue';
import { bookAuthors, displayDate } from '@/lib/adoptions';
import { sampleDate } from './adoptionSampleData';

const props = defineProps({ record: { type: Object, default: null } });
const open = defineModel('open', { type: Boolean, default: false });
const emit = defineEmits(['pickup', 'cancel', 'withdraw', 'closed']);
const view = ref('details');
const previousView = ref('details');
const draft = reactive({ location: '', date: '', time: '' });
const initialDraft = ref('');
const heading = ref(null);
const changed = computed(() => JSON.stringify(draft) !== initialDraft.value);
const editing = computed(() => ['pickup confirmed', 'pickup requested'].includes(props.record?.code));
const title = computed(() => ({
  details: 'Adoption details', form: editing.value ? 'Request a pickup change' : 'Arrange pickup',
  review: 'Review pickup request', sent: 'Pickup request sent', cancel: 'Cancel this pickup?',
  withdraw: 'Withdraw this book request?', discard: 'Discard your changes?',
})[view.value]);
watch(open, (value) => {
  if (!value || !props.record) return;
  const pickup = props.record.appointment;
  Object.assign(draft, { location: pickup?.location || props.record.book.collectionarea, date: pickup?.appointmentdate || '', time: pickup?.timeslot || '' });
  initialDraft.value = JSON.stringify(draft);
  view.value = props.record.canArrange ? 'form' : 'details';
});
watch(view, async () => { await nextTick(); heading.value?.$el?.focus(); });

function requestClose(value) {
  if (value) { open.value = true; return; }
  if (changed.value && view.value !== 'sent') {
    if (view.value !== 'discard') previousView.value = view.value;
    view.value = 'discard';
    return;
  }
  open.value = false;
}
function send() {
  if (view.value !== 'review') return;
  emit('pickup', { ...draft });
  initialDraft.value = JSON.stringify(draft);
  view.value = 'sent';
}
function discard() { initialDraft.value = JSON.stringify(draft); open.value = false; }
</script>

<template>
  <Dialog :open="open" @update:open="requestClose">
    <DialogContent v-if="record" class="adoption-dialog sample-dialog" @closeAutoFocus="(event) => { event.preventDefault(); emit('closed'); }">
      <DialogHeader>
        <DialogTitle ref="heading" tabindex="-1">{{ title }}</DialogTitle>
        <DialogDescription>Follow your request and arrange collection.</DialogDescription>
      </DialogHeader>
      <div class="dialog-body">
        <CustomerAdoptionProgress :applicationStatus="record.application.status" :pickupStatus="record.appointment?.status || ''" :editingPickup="['form', 'review'].includes(view)" />
        <AppBookIdentity :title="record.book.title" :author="bookAuthors(record.book)" :cover="record.book.thumbnailurl" coverClass="w-12" wrap />

        <div v-if="view === 'discard'">
          <p>Your pickup preferences haven’t been sent.</p>
          <div class="adoption-actions">
            <Button variant="outline" @click="view = previousView">Keep editing</Button>
            <Button @click="discard">Discard changes</Button>
          </div>
        </div>

        <template v-else-if="view === 'details'">
          <div role="status">
            <Badge :variant="record.variant">{{ record.label }}</Badge>
            <p class="mt-3 leading-relaxed">{{ record.description }}</p>
          </div>
          <dl v-if="record.appointment && ['pickup confirmed', 'pickup requested', 'collected'].includes(record.code)" class="sample-facts">
            <dt>{{ record.code === 'pickup requested' ? 'Preferred pickup' : 'Pickup' }}</dt>
            <dd>{{ displayDate(record.appointment.appointmentdate) }} · {{ record.appointment.timeslot }} SGT</dd>
            <dt>Meeting point</dt><dd>{{ record.appointment.location }}</dd>
          </dl>
          <details class="sample-information">
            <summary>About this book and request</summary>
            <dl class="sample-facts mt-4"><dt>Condition</dt><dd>{{ record.book.condition }}</dd><dt>Collection area</dt><dd>{{ record.book.collectionarea }}</dd><dt>Requested</dt><dd>{{ displayDate(record.application.createdat) }}</dd><dt>Reference</dt><dd>{{ record.id }}</dd></dl>
          </details>
          <div class="adoption-actions">
            <Button v-if="record.canArrange || editing" @click="view = 'form'">{{ editing ? 'Request a change' : 'Arrange pickup' }}</Button>
            <Button v-else variant="outline" @click="requestClose(false)">Back to My Adoptions</Button>
          </div>
          <button v-if="editing" class="sample-text-action" @click="view = 'cancel'">Cancel pickup</button>
          <button v-if="record.canWithdraw" class="sample-text-action" @click="view = 'withdraw'">Withdraw request</button>
        </template>

        <form v-else-if="view === 'form'"  @submit.prevent="view = 'review'">
          <p class="leading-relaxed">{{ editing ? 'Sending changes replaces your current pickup and requires confirmation again.' : 'Choose your preferred meeting point and time. The team will confirm before you travel.' }}</p>
          <div class="space-y-2"><label for="sample-location">Preferred meeting point</label><Input id="sample-location" v-model="draft.location" required maxlength="200" /><p class="text-xs text-muted-foreground">{{ record.book.collectionarea }} is the suggested meeting point. You can change it.</p></div>
          <div class="sample-form-pair">
            <div class="space-y-2"><label for="sample-date">Preferred date</label><Input id="sample-date" v-model="draft.date" type="date" :min="sampleDate(0)" required /></div>
            <div class="space-y-2"><label for="sample-time">Preferred time · SGT</label><Input id="sample-time" v-model="draft.time" placeholder="e.g. 10:00–11:00" required maxlength="100" /></div>
          </div>
          <div class="adoption-actions"><Button type="button" variant="outline" @click="view = 'details'">Back</Button><Button type="submit">Review pickup request</Button></div>
        </form>

        <template v-else-if="view === 'review' || view === 'sent'">
          <p v-if="view === 'sent'" role="status" class="leading-relaxed">Wait for the team to confirm your pickup before travelling. Track updates in My Adoptions.</p>
          <p v-else class="leading-relaxed">Check your preferences before sending. {{ editing ? 'The team will need to confirm this new time.' : 'Your pickup is confirmed only after the team approves it.' }}</p>
          <dl class="sample-facts"><dt>Preferred date</dt><dd>{{ displayDate(draft.date) }}</dd><dt>Preferred time</dt><dd>{{ draft.time }} SGT</dd><dt>Meeting point</dt><dd>{{ draft.location }}</dd></dl>
          <div class="adoption-actions">
            <template v-if="view === 'review'"><Button variant="outline" @click="view = 'form'">Back to preferences</Button><Button @click="send">Send pickup request</Button></template>
            <Button v-else @click="requestClose(false)">Back to My Adoptions</Button>
          </div>
        </template>

        <template v-else-if="view === 'cancel' || view === 'withdraw'">
          <p class="leading-relaxed">{{ view === 'cancel' ? 'Your adoption stays approved. You can arrange another pickup when you’re ready.' : 'This request will move to History. You can browse for another book any time.' }}</p>
          <div class="adoption-actions"><Button variant="outline" @click="view = 'details'">Go back</Button><Button @click="emit(view === 'cancel' ? 'cancel' : 'withdraw'); open = false">{{ view === 'cancel' ? 'Cancel pickup' : 'Withdraw request' }}</Button></div>
        </template>
        <p class="text-xs text-muted-foreground">Sample interaction · no requests are sent.</p>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.sample-facts { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 12px 20px; line-height: 1.6; }
.sample-facts dt { color: var(--muted-foreground); }
.sample-information { border-block: 1px solid var(--border); padding-block: 16px; }
.sample-information summary { cursor: pointer; min-height: 28px; }
.sample-text-action { display: block; min-height: 44px; margin-top: 8px; text-decoration: underline; text-underline-offset: 4px; }
.sample-form-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 639px) { .sample-facts { grid-template-columns: 1fr; gap: 4px; } .sample-facts dd + dt { margin-top: 10px; } .sample-form-pair { grid-template-columns: 1fr; } }
</style>
