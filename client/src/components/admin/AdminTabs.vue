<script setup>
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
defineProps({ tabs: { type: Array, required: true }, disabled: Boolean, label: { type: String, default: 'Views' } });
const value = defineModel({ type: [String, Number], required: true });
</script>

<template>
  <Tabs v-model="value">
    <TabsList :aria-label="label" class="w-full text-sm font-normal">
      <TabsTrigger v-for="tab in tabs" :key="tab.value" :value="tab.value" :disabled="disabled || tab.disabled">
        <slot name="tab" :tab="tab">{{ tab.label }}</slot>
      </TabsTrigger>
    </TabsList>
    <slot />
  </Tabs>
</template>


