<script setup>
import { watch } from 'vue';
import { useConfirmation } from '@/lib/confirmation';
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
  showFooterSeparator: { type: Boolean, default: true },
  noValidate: { type: Boolean, default: false }, //@lee-hlmilk > let parent validate on submit &&& show toast > native validation otherwise blocks submit event
  hideForm: { type: Boolean, default: false }, //@lee-hlmilk > hide form when in search-only step > eg. open library lookup before selecting a book
  contentClass: { type: null, default: null },
  bodyClass: { type: null, default: null }
});

const emit = defineEmits(['submit']);
//@lee-hlmilk > open proxies the parent's v-model > change it only after submitting &&& discard guards allow closing
const open = defineModel('open', { type: Boolean, default: false });
const { confirm, cancel } = useConfirmation();
watch(open, isOpen => { if (!isOpen) { cancel(); } });

//@lee-hlmilk > keep the draft mounted while the persistent toast asks whether to discard it
async function handleOpenChange(nextOpen) {
  if (nextOpen) { open.value = true; return; }
  if (props.submitting) { return; }
  if (props.dirty && !await confirm('Discard your changes?', {
    description: 'Your unsaved changes will be lost.', actionLabel: 'Discard', cancelLabel: 'Keep editing', destructive: true
  })) { return; }
  if (!props.submitting) { open.value = false; }
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent v-bind="props.description ? {} : { 'aria-describedby': undefined }" :class="props.contentClass" :showCloseButton="!submitting">
      <DialogHeader>
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription v-if="description">{{ description }}</DialogDescription>
      </DialogHeader>
      <hr>

      <!--@lee-hlmilk > dialog body &&& form-->
      <div class="space-y-5" :class="props.bodyClass">
        <!--@lee-hlmilk > optional top slot > eg. mode toggle ||| open library search-->
        <slot name="top" />

        <!--@lee-hlmilk > main form wrapper > hidden when searching before draft selection-->
        <!--@lee-hlmilk > forward the original submit event so forms can inspect controls &&& the clicked submitter-->
        <form v-if="!hideForm" :novalidate="props.noValidate" @submit.prevent="emit('submit', $event)">
          <slot />
          <hr v-if="props.showFooterSeparator">
          <DialogFooter>
            <!--@lee-hlmilk > footer replaces default buttons > extraActions adds buttons while retaining the defaults-->
            <slot name="footer">
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
