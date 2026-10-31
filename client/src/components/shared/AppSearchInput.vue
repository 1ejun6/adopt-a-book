<script setup>
import { ref } from 'vue';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';

defineOptions({ inheritAttrs: false });
const props = defineProps({
  class: { type: null, required: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
});
const search = defineModel({ type: String, default: '' });
const input = ref(null);

//@1ejun6 > clear search & return focus so typing can continue
function clearsearch() {
  search.value = '';
  input.value?.$el.focus();
}
</script>

<template>
  <div class="relative min-w-0" :class="props.class">
    <Input ref="input" v-model="search" v-bind="$attrs" type="text" role="searchbox"
      :aria-label="$attrs['aria-label'] || 'search'" :disabled="props.disabled" :readonly="props.readonly"
      class="h-auto p-2.5 pr-10 text-sm" />
    <button type="button" aria-label="clear search" :disabled="!search || props.disabled || props.readonly"
      class="absolute inset-y-0 right-0 px-2.5" @click="clearsearch">
      <HugeiconsIcon :icon="Cancel01Icon" class="size-5" aria-hidden="true" />
    </button>
  </div>
</template>
