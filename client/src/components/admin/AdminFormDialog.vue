<script setup>
import { ref, watch } from 'vue';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

//@lee-hlmilk > reusable dialog form props for book inventory &&& adoption drives
const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  submitLabel: { type: String, default: 'Save' },
  submittingLabel: { type: String, default: 'Saving…' },
  submitting: { type: Boolean, default: false },
  dirty: { type: Boolean, default: false },
  noValidate: { type: Boolean, default: false }, //@lee-hlmilk > let parent validate on submit &&& show toast > native validation otherwise blocks submit event
  hideForm: { type: Boolean, default: false }, //@lee-hlmilk > hide form when in search-only step > eg. open library lookup before selecting a book
  contentClass: { type: null, default: null }
});

const emit = defineEmits(['submit', 'discard']);
const open = defineModel('open', { type: Boolean, default: false });
const confirmingDiscard = ref(false);

//@lee-hlmilk > reset discard prompt whenever dialog closes
watch(open, (isOpen) => {
  if (!isOpen) { confirmingDiscard.value = false; }
});

//@lee-hlmilk > intercept close when form has unsaved edits ||| is mid-submit
function handleOpenChange(nextOpen) {
  if (nextOpen) {
    open.value = true;
    return;
  }
  if (props.submitting) { return; }
  //@lee-hlmilk > repeated escape ||| outside clicks must stay on confirmation > only discard button closes a dirty form
  if (props.dirty) {
    confirmingDiscard.value = true;
    return;
  }
  confirmingDiscard.value = false;
  open.value = false;
}

//@lee-hlmilk > confirm discarding unsaved changes &&& close dialog
function discardChanges() {
  confirmingDiscard.value = false;
  open.value = false;
  emit('discard');
}
</script>

<template>
  <!--@lee-hlmilk > controlled dialog > intercepts close events for dirty check-->
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent :class="props.contentClass" :showCloseButton="!confirmingDiscard && !submitting">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">{{ description }}</DialogDescription>
      </DialogHeader>
      <hr>

      <!--@lee-hlmilk > unsaved changes confirmation view-->
      <div v-if="confirmingDiscard" class="space-y-5" role="alert">
        <div class="space-y-2.5">
          <h2>Discard your changes?</h2>
          <p class="text-muted-foreground">Your unsaved changes will be lost.</p>
        </div>
        <hr>
        <DialogFooter>
          <!--@lee-hlmilk > return to form without losing draft-->
          <Button type="button" variant="outline" class="flex-1" @click="confirmingDiscard = false">
            Keep editing
          </Button>
          <!--@lee-hlmilk > discard draft &&& close-->
          <Button type="button" variant="destructive" class="flex-1" @click="discardChanges">
            Discard changes
          </Button>
        </DialogFooter>
      </div>

      <!--@lee-hlmilk > dialog body &&& form-->
      <div v-else class="space-y-5">
        <!--@lee-hlmilk > optional top slot > eg. mode toggle ||| open library search-->
        <!--@lee-hlmilk > requestClose lets custom actions use the same dirty &&& submitting guards-->
        <slot name="top" :requestClose="() => handleOpenChange(false)" />

        <!--@lee-hlmilk > main form wrapper > hidden when searching before draft selection-->
        <form v-if="!hideForm" :novalidate="props.noValidate" @submit.prevent="emit('submit', $event)">
          <slot />
          <hr>
          <DialogFooter>
            <slot name="footer" :requestClose="() => handleOpenChange(false)">
              <Button type="button" variant="outline" :disabled="submitting" @click="handleOpenChange(false)">
                Cancel
              </Button>
              <!--@lee-hlmilk > extra footer actions > eg. add &&& continue-->
              <slot name="extraActions" />
              <Button type="submit" class="flex-1" :disabled="submitting">
                {{ submitting ? submittingLabel : submitLabel }}
              </Button>
            </slot>
          </DialogFooter>
        </form>
      </div>
    </DialogContent>
  </Dialog>
</template>
