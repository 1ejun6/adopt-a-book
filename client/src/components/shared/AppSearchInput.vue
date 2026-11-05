<script setup>
import { useId } from 'vue';
import { Input } from '@/components/ui/input';

defineOptions({ inheritAttrs: false });
const props = defineProps({
  id: { type: String, default: undefined },
  class: { type: null, required: false },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
});
const search = defineModel({ type: String, default: '' });
const inputid = useId();

</script>

<template>
  <div class="relative min-w-0" :class="props.class">
    <label :for="props.id || inputid" class="sr-only">search</label>
    <Input :id="props.id || inputid" v-model="search" v-bind="$attrs" type="text" role="searchbox" :disabled="props.disabled" :readonly="props.readonly"
      class="bg-transparent" />
  </div>
</template>
