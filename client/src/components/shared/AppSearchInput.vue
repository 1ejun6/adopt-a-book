<script setup>
import { ref, useId } from 'vue';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';

defineOptions({ inheritAttrs: false });
const props = defineProps({
  id: { type: String, default: undefined },
  class: { type: null, required: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
});
const search = defineModel({ type: String, default: '' });
const input = ref(null);
const inputid = useId();

//@1ejun6 > clear search & return focus so typing can continue
function clearsearch() {
  search.value = '';
  input.value?.$el.focus();
}
</script>

<template>
  <div class="relative min-w-0" :class="props.class">
    <label :for="props.id || inputid" class="sr-only">search</label>
    <Input :id="props.id || inputid" ref="input" v-model="search" v-bind="$attrs" type="text" role="searchbox" :disabled="props.disabled" :readonly="props.readonly"
      class="pr-11" />
    <button type="button" :disabled="!search || props.disabled || props.readonly"
      class="absolute inset-y-0 right-0 min-h-11 min-w-11 px-2.5" @click="clearsearch">
      <HugeiconsIcon :icon="Cancel01Icon" class="size-5" aria-hidden="true" />
      <span class="sr-only">clear search</span>
    </button>
  </div>
</template>
