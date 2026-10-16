<script setup>
import { cn } from '@/lib/utils';

//@1ejun6 > placeholder shown while content is loading
const props = defineProps({
  class: { type: null, required: false },
});
</script>

<template>
  <!--@lee-hlmilk > bg-border/60 instead of default bg-primary/10 for visible pulse animation-->
  <div data-slot="skeleton" :class="cn('rounded-lg bg-border/60', props.class)" />
</template>
