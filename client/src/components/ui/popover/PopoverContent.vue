<script setup>
import { PopoverContent, PopoverPortal } from 'reka-ui';
import { cn } from '@/lib/utils';

defineOptions({ inheritAttrs: false });
const props = defineProps({ class: { type: null, default: null } });
</script>

<template>
    <PopoverPortal>
        <PopoverContent v-bind="$attrs" :sideOffset="5" :class="cn('z-50 rounded-lg border bg-background text-foreground shadow-md', props.class)">
            <slot />
        </PopoverContent>
    </PopoverPortal>
</template>
