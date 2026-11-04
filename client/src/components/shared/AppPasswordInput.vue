<script setup>
import { ref } from 'vue';
import { Eye, EyeOff } from '@lucide/vue';
import { Input } from '@/components/ui/input';

defineOptions({ inheritAttrs: false });
defineProps({ disabled: { type: Boolean, default: false } });
const model = defineModel({ type: String, default: '' });
const visible = ref(false);
</script>

<template>
  <div class="relative">
    <Input v-bind="$attrs" v-model="model" :type="visible ? 'text' : 'password'"
      :disabled="disabled" class="pr-11" />
    <button type="button" class="absolute inset-y-0 right-0 grid w-11 place-items-center"
      :aria-label="visible ? 'Hide password' : 'Show password'" :aria-pressed="visible"
      :aria-controls="$attrs.id" :disabled="disabled" @click="visible = !visible">
      <component :is="visible ? EyeOff : Eye" class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
