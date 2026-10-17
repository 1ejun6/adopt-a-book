<script setup>
import { reactiveOmit } from '@vueuse/core';
import { TabsList } from 'reka-ui';
import { cn } from '@/lib/utils';

const props = defineProps({
  loop: { type: Boolean, required: false },
  asChild: { type: Boolean, required: false },
  as: { type: null, required: false },
  class: { type: null, required: false },
});

const delegatedProps = reactiveOmit(props, 'class');
</script>

<template>
  <TabsList data-slot="tabs-list" v-bind="delegatedProps"
    :class="cn('inline-flex flex-wrap gap-2.5', props.class)">
    <slot />
  </TabsList>
</template>
