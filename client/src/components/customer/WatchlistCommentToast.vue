<script setup>
import { ref } from 'vue';
import { FocusScope } from 'reka-ui';
import { toast } from 'vue-sonner';
import { Cancel01Icon, CancelCircleIcon, CheckmarkCircle02Icon, PencilEdit02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/vue';
import { useWatchlistStore } from '@/stores/watchlist';
const store = useWatchlistStore();
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const props = defineProps({
  entry: { type: Object, required: true },
  toastId: { type: String, required: true },
  trigger: { type: Object, default: null },
  editing: { type: Boolean, default: false },
});
const emit = defineEmits(['saved']);
const comment = ref(props.editing ? props.entry.comments || '' : '');
const busy = ref(false);
const error = ref('');

function dismiss() {
  toast.dismiss(props.toastId);
}

// The bookmark is disabled during saving; return focus once the toast closes.
function restoreFocus(event) {
  event.preventDefault();
  if (props.trigger?.isConnected) props.trigger.focus();
}

async function saveComment() {
  if (busy.value) return;
  if (!props.editing && !comment.value.trim()) { dismiss(); return; }
  busy.value = true;
  error.value = '';
  try {
    await store.updateComment(props.entry.id, comment.value.trim());
    emit('saved', { id: props.entry.id, comments: comment.value.trim() });
    dismiss();
    toast.success('comment saved', { duration: 1000, style: { pointerEvents: 'auto' } });
  } catch (failure) {
    error.value = failure.message;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <FocusScope asChild trapped loop @unmountAutoFocus="restoreFocus">
    <div class="w-full space-y-2.5 rounded-lg border bg-background p-5 font-body text-sm"
      @keydown.esc.prevent.stop="dismiss">
      <div class="flex items-start gap-2.5">
        <HugeiconsIcon :icon="error ? CancelCircleIcon : editing ? PencilEdit02Icon : CheckmarkCircle02Icon" class="size-5 shrink-0"
          :class="error ? 'text-destructive' : 'text-success-foreground'" aria-hidden="true" />
        <div class="min-w-0 flex-1">
          <p :role="error ? 'alert' : undefined">{{ error || (editing ? 'edit your note' : 'saved to watchlist') }}</p>
          <p class="truncate text-muted-foreground" :title="entry.bookid.title">{{ entry.bookid.title }}</p>
        </div>
        <button type="button" title="dismiss" @click="dismiss">
          <HugeiconsIcon :icon="Cancel01Icon" class="size-5" aria-hidden="true" />
        </button>
      </div>
      <form class="flex gap-2.5" @submit.prevent="saveComment">
        <Input v-model="comment" maxlength="300" :disabled="busy" placeholder="optional comment" class="text-sm" />
        <Button type="submit" class="shrink-0" :disabled="busy">{{ busy ? 'saving…' : 'save' }}</Button>
      </form>
    </div>
  </FocusScope>
</template>
