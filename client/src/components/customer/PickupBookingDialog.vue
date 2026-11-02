<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

const props = defineProps({
  application: { type: Object, default: null },
  appointment: { type: Object, default: null }
});

const open = defineModel('open', {
  type: Boolean,
  default: false
});

const emit = defineEmits(['saved']);

const form = reactive({
  location: '',
  appointmentdate: '',
  timeslot: ''
});

const busy = ref(false);
const error = ref('');
const book = computed(() => props.application?.bookid);

// Match the database's Singapore calendar date.
function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

// Reset the form whenever the dialog opens.
watch(open, value => {
  if (!value) return;

  error.value = '';

  Object.assign(form, {
    location:
      props.appointment?.location || book.value?.collectionarea || '',
    appointmentdate:
      props.appointment?.appointmentdate || '',
    timeslot:
      props.appointment?.timeslot || ''
  });
});

async function submit() {
  if (busy.value) return;

  error.value = '';

  const body = {
    location: form.location.trim(),
    appointmentdate: form.appointmentdate,
    timeslot: form.timeslot.trim()
  };

  if (
    !body.location ||
    !body.timeslot ||
    !body.appointmentdate ||
    body.appointmentdate < today()
  ) {
    error.value =
      'Enter a location, a date of today or later, and a proposed time.';
    return;
  }

  if (!props.appointment && !book.value?.id) {
    error.value =
      'Book information is missing. Close this dialog and refresh your pickups.';
    return;
  }

  busy.value = true;

  try {
    const id = props.appointment?.id;

    // New proposals need a book ID; rescheduling only sends changed fields.
    if (!id) body.bookid = book.value.id;

    await api(id ? `/appointments/${id}` : '/appointments', {
      method: id ? 'PATCH' : 'POST',
      body
    });

    emit('saved');
  } catch (failure) {
    error.value = failure.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="value => { if (!busy) open = value; }"
  >
    <DialogContent
      class="max-h-[90vh] overflow-y-auto"
      :show-close-button="!busy"
    >
      <DialogHeader>
        <DialogTitle>
          {{ appointment ? 'Reschedule Pickup' : 'Arrange Pickup' }}
        </DialogTitle>

        <DialogDescription>
          Propose a collection location and time. The book owner or team
          must confirm your proposal.
        </DialogDescription>
      </DialogHeader>

      <AppBookIdentity
        v-if="book"
        class="px-5 pt-5"
        :title="book.title"
        :author="book.authors?.join(', ')"
        :cover="book.coverurl"
        cover-class="w-16"
      />

      <p v-else class="px-5 pt-5 text-sm">
        {{ appointment?.booktitle }}
      </p>

      <form
        class="space-y-5 p-5"
        :aria-busy="busy"
        @submit.prevent="submit"
      >
        <fieldset :disabled="busy" class="space-y-4">
          <div class="space-y-2">
            <Label for="pickup-location">Collection location</Label>
            <Input
              id="pickup-location"
              v-model="form.location"
              required
              maxlength="300"
              placeholder="Propose an exact meeting point"
            />
          </div>

          <div class="space-y-2">
            <Label for="pickup-date">Collection date</Label>
            <Input
              id="pickup-date"
              v-model="form.appointmentdate"
              type="date"
              :min="today()"
              required
            />
          </div>

          <div class="space-y-2">
            <Label for="pickup-time">
              Proposed time (Singapore time)
            </Label>
            <Input
              id="pickup-time"
              v-model="form.timeslot"
              required
              maxlength="100"
              placeholder="e.g. 2:00 PM – 3:00 PM"
            />
          </div>
        </fieldset>

        <p class="text-sm text-muted-foreground">
          {{ appointment
            ? 'Rescheduling sends the appointment back for confirmation.'
            : 'This is a proposal, not a confirmed booking.' }}
        </p>

        <p v-if="error" role="alert" class="text-sm text-destructive">
          {{ error }}
        </p>

        <div class="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            :disabled="busy"
            @click="open = false"
          >
            Back
          </Button>

          <Button type="submit" :disabled="busy">
            {{ busy ? 'Sending...' : 'Send Proposal' }}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>