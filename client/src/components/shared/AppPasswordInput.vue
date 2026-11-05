<script setup>
import { ref, watch } from 'vue';
import { ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';

defineOptions({ inheritAttrs: false });
defineProps({ disabled: { type: Boolean, default: false }, label: { type: String, default: 'password' } });
const model = defineModel({ type: String, default: '' });
const visible = ref(false);
watch(model, value => { if (!value) visible.value = false; });
</script>

<template>
  <div class="relative">
    <Input v-bind="$attrs" v-model="model" :type="visible ? 'text' : 'password'"
      :disabled="disabled" clearButtonClass="right-11" />
    <button type="button" class="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-lg"
      :aria-label="`${visible ? 'Hide' : 'Show'} ${label}`" :aria-pressed="visible"
      :aria-controls="$attrs.id" :disabled="disabled" @click="visible = !visible">
      <HugeiconsIcon :icon="visible ? ViewOffSlashIcon : ViewIcon" class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
