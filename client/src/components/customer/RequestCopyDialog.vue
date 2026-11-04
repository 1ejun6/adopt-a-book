<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';
import CustomerAdoptionProgress from './CustomerAdoptionProgress.vue';
import { bookAuthors, collectionLocation } from '@/lib/adoptions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const props = defineProps({
  book: { type: Object, default: null },
  reader: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  submitted: { type: Boolean, default: false },
  existing: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
  receiptWarning: { type: String, default: '' },
  uncertain: { type: Boolean, default: false },
  applicationStatus: { type: String, default: 'pending' },
  applicationId: { type: String, default: '' },
});
const open = defineModel('open', { type: Boolean, default: false });
//@1ejun6 > shared request dialog > caller supplies data & handles submission
const emit = defineEmits(['submit', 'check', 'back', 'restore-focus']);
const errorNode = ref(null);
const saving = computed(() => props.loading && !props.submitted);
const adoptionsLink = computed(() => {
  const query = {};
  if (props.applicationId) {
    query.request = props.applicationId;
  }
  return { name: 'customerAdoptions', query };
});
watch(
  () => props.error,
  async (value) => {
    if (value) {
      await nextTick();
      errorNode.value?.focus();
    }
  },
);
function updateOpen(value) {
  if (!saving.value) {
    open.value = value;
  }
}
function preventClosing(event) {
  if (saving.value) {
    event.preventDefault();
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="updateOpen">
    <DialogContent
      v-if="book"
      class="adoption-dialog max-w-[720px]"
      :showCloseButton="!saving"
      @closeAutoFocus="emit('restore-focus', $event)"
      @escapeKeyDown="preventClosing"
      @interactOutside="preventClosing"
    >
      <DialogHeader>
        <DialogTitle>{{ submitted ? 'Adoption request sent' : 'Request this book' }}</DialogTitle>
        <DialogDescription>
          {{
            submitted
              ? 'Follow the outcome in My Adoptions.'
              : 'Review the selected copy before sending your request.'
          }}
        </DialogDescription>
      </DialogHeader>
      <div class="dialog-body space-y-5">
        <CustomerAdoptionProgress
          :applicationStatus="submitted || existing ? applicationStatus : 'pending'"
          :verified="
            !uncertain && (!existing || ['pending', 'pending review'].includes(applicationStatus))
          "
        />
        <AppBookIdentity
          :title="book.title"
          :author="bookAuthors(book)"
          :cover="book.coverurl || book.thumbnailurl"
          coverClass="w-14"
          wrap
        />
        <template v-if="submitted">
          <Badge variant="neutral">{{
            applicationStatus === 'approved' ? 'Approved' : 'Under review'
          }}</Badge>
          <p class="text-sm">
            {{
              applicationStatus === 'approved'
                ? 'Your adoption is approved. View your request to check pickup arrangements.'
                : 'We’re reviewing your book request. You can arrange pickup after approval. Track updates in Active in My Adoptions.'
            }}
          </p>
          <p v-if="receiptWarning" class="text-sm text-muted-foreground" role="status">
            {{ receiptWarning }}
          </p>
          <details v-if="applicationId" class="text-sm">
            <summary class="min-h-11 cursor-pointer py-3 underline underline-offset-4">
              Request reference
            </summary>
            <p class="select-all [overflow-wrap:anywhere]">{{ applicationId }}</p>
          </details>
          <div class="adoption-actions">
            <button
              type="button"
              class="min-h-11 text-sm underline underline-offset-4"
              @click="open = false"
            >
              Continue browsing
            </button>
            <Button asChild >
              <RouterLink :to="adoptionsLink">View my request</RouterLink>
            </Button>
          </div>
        </template>
        <template v-else>
          <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
            <dt class="text-muted-foreground">Condition</dt>
            <dd>{{ book.condition || 'Not listed' }}</dd>
            <dt class="text-muted-foreground">Collection area</dt>
            <dd class="[overflow-wrap:anywhere]">{{ collectionLocation(book) || 'Not listed' }}</dd>
          </dl>
          <section class="space-y-3 text-sm" aria-label="Requesting as">
            <h3 class="text-xl">Requesting as</h3>
            <dl class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
              <dt class="text-muted-foreground">Name</dt>
              <dd>{{ reader?.name || 'Reader' }}</dd>
              <dt class="text-muted-foreground">Email</dt>
              <dd class="[overflow-wrap:anywhere]">{{ reader?.email || 'Not available' }}</dd>
            </dl>
          </section>
          <p class="text-sm text-muted-foreground">
            The team reviews your request. You can arrange collection after approval.
          </p>
          <p
            v-if="error"
            ref="errorNode"
            tabindex="-1"
            class="text-sm text-destructive"
            role="alert"
          >
            {{ error }}
          </p>
          <div class="adoption-actions">
            <Button
              type="button"
              variant="outline"

              :disabled="loading"
              @click="emit('back')"
              >Back to book details</Button
            >
            <Button
              v-if="uncertain"
              type="button"
              variant="outline"

              :disabled="loading"
              @click="emit('check')"
              >Check status again</Button
            >
            <Button v-else-if="existing" asChild >
              <RouterLink :to="adoptionsLink">View my request</RouterLink>
            </Button>
            <Button
              v-else
              type="button"

              :disabled="loading || disabled"
              :aria-busy="loading"
              @click="emit('submit')"
            >
              {{ loading ? 'Sending…' : 'Send adoption request' }}
            </Button>
          </div>
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>
