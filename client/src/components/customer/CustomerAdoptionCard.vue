<script setup>
import { computed } from 'vue';
import { getApplicationStatus, getApplicationDate, getApplicationBook } from '@/lib/adoptions';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';

//@sree-sanjana06 > reusable card for customer adoption requests
const props = defineProps({
  application: { type: Object, required: true },
  showPickup: { type: Boolean, default: false },
  pickupAvailable: { type: Boolean, default: false },
});
//@sree-sanjana06 > let the parent page handle navigation and book previews
const emit = defineEmits(['view', 'pickup']);
const book = computed(() => getApplicationBook(props.application));
//@sree-sanjana06 > format the book's authors consistently with existing pages
const authors = computed(() => {
  const value = book.value?.authors || book.value?.author;
  if (Array.isArray(value)) {
    return value.map(author => typeof author === 'string' ? author : author?.name).filter(Boolean).join(', ') || 'Unknown author';
  }
  return typeof value === 'string' && value ? value : 'Unknown author';
});
//@sree-sanjana06 > use the existing book cover field
const cover = computed(() => book.value?.coverurl || book.value?.coverUrl || book.value?.cover || '');
//@sree-sanjana06 > only open the book preview when a valid book ID exists
const canViewBook = computed(() => Boolean(book.value?.id));

// Status presentation belongs to the card; the page decides which group it appears in.
const status = computed(() => getApplicationStatus(props.application));
//@sree-sanjana06 > display readable adoption status labels
const statusLabel = computed(() => {
  const labels = {
    pending: 'Pending Review',
    'pending review': 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    cancelled: 'Cancelled',
    collected: 'Collected',
    completed: 'Completed',
    'pickup requested': 'Pickup Requested',
    'pickup confirmed': 'Pickup Confirmed',
    unknown: 'Status Unavailable',
  };
  return labels[status.value] || status.value.replace(/\b\w/g, character => character.toUpperCase());
});
//@sree-sanjana06 > keep status badge colours consistent with the existing theme
const statusClass = computed(() => {
  if (status.value === 'approved') return 'bg-emerald-100 text-emerald-800';
  if (['pending', 'pending review'].includes(status.value)) return 'bg-amber-100 text-amber-800';
  if (['rejected', 'withdrawn', 'cancelled'].includes(status.value)) return 'bg-red-100 text-red-800';
  if (['collected', 'completed'].includes(status.value)) return 'bg-slate-100 text-slate-700';
  return 'bg-muted text-muted-foreground';
});
//@sree-sanjana06 > explain the next step for each application status
const statusDescription = computed(() => {
  const descriptions = {
    pending: 'your request is awaiting administrator approval',
    'pending review': 'your request is awaiting administrator approval',
    approved: 'your request has been approved check your pickup arrangements',
    rejected: 'your adoption request was not approved',
    withdrawn: 'this adoption request was withdrawn',
    cancelled: 'this adoption request was cancelled',
    collected: 'this book has been collected',
    completed: 'this adoption has been completed',
    'pickup requested': 'your proposed pickup time is awaiting confirmation',
    'pickup confirmed': 'your pickup appointment has been confirmed',
    unknown: 'the status of this request is currently unavailable',
  };
  return descriptions[status.value] || 'check back for updates about this request';
});

const submittedDate = computed(() => getApplicationDate(props.application));
//@sree-sanjana06 > display dates in a readable Singapore format
const formattedDate = computed(() => {
  if (!submittedDate.value) return 'Date unavailable';
  const date = new Date(submittedDate.value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' });
});
</script>

<template>
  <!--@sree-sanjana06 > shared card layout for active and historical requests-->
  <article class="flex h-full flex-col gap-4 rounded-xl border bg-card p-5">
    <!--@sree-sanjana06 > reuse the existing book identity component-->
    <div class="min-w-0">
      <AppBookIdentity v-if="book" :title="book.title || 'Untitled Book'" :author="authors" :cover="cover"
        coverClass="w-20" />
      <p v-else class="text-sm text-muted-foreground">book details unavailable</p>
    </div>
    <!--@sree-sanjana06 > show submission date and application status-->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted-foreground">requested {{ formattedDate }}</p>
      <span :class="['inline-flex rounded-full px-3 py-1 text-xs font-medium', statusClass]">{{ statusLabel }}</span>
    </div>
    <!--@sree-sanjana06 > explain the request status and display relevant actions-->
    <div class="mt-auto space-y-4 border-t pt-4">
      <p class="text-sm text-muted-foreground">{{ statusDescription }}</p>
      <!--@sree-sanjana06 > approved requests can navigate to the pickup page-->
      <div v-if="showPickup" class="flex flex-wrap gap-2">
        <Button class="flex-1" :disabled="!pickupAvailable" @click="emit('pickup', application)">Arrange Pickup</Button>
        <Button v-if="canViewBook" variant="outline" @click="emit('view', application)">View Book</Button>
      </div>
      <!--@sree-sanjana06 > other requests can still preview their book-->
      <Button v-else-if="canViewBook" variant="outline" size="sm" @click="emit('view', application)">View Book</Button>
      <!--@sree-sanjana06 > avoid linking to an unfinished pickup page-->
      <p v-if="showPickup && !pickupAvailable" class="text-sm text-muted-foreground">pickup scheduling is not available
        yet</p>
    </div>
  </article>
</template>
