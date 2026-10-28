<script setup>
import { computed, ref } from 'vue';
import { parseDate, today } from '@internationalized/date';
import { Calendar03Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const props = defineProps({
    modelValue: { type: String, default: '' },
    label: { type: String, default: 'Date' }
});
const emit = defineEmits(['update:modelValue']);
const open = ref(false);
//@lee-hlmilk > calendar uses DateValue > keep the existing YYYY-MM-DD string filter in views
const selectedDate = computed(() => props.modelValue ? parseDate(props.modelValue) : undefined);
const defaultDate = today('Asia/Singapore');
function selectDate(date) {
    emit('update:modelValue', date?.toString() || '');
    open.value = false;
}
</script>

<template>
    <div class="relative flex w-full sm:w-44">
        <Popover :open="open" @update:open="open = $event">
            <PopoverTrigger asChild>
                <!--@lee-hlmilk > h-auto &&& padding/leading match the toolbar > label padding reserves room for Clear-->
                <Button type="button" variant="outline" :aria-label="props.label" class="h-auto w-full gap-2.5 p-2.5 text-left leading-4">
                    <span class="min-w-0 flex-1 truncate pr-7" :class="!props.modelValue && 'text-muted-foreground'">{{ props.modelValue ? props.modelValue.split('-').reverse().join('/') : 'dd/mm/yyyy' }}</span>
                    <HugeiconsIcon :icon="Calendar03Icon" class="size-4 shrink-0" aria-hidden="true" />
                </Button>
            </PopoverTrigger>
            <!--@lee-hlmilk > Calendar owns the inset > PopoverContent adds the border &&& background without extra padding-->
            <PopoverContent align="start">
                <Calendar :modelValue="selectedDate" :defaultPlaceholder="defaultDate" @update:modelValue="selectDate" />
            </PopoverContent>
        </Popover>
        <button v-if="props.modelValue" type="button" class="absolute inset-y-0 right-8 flex w-7 items-center justify-center"
            :aria-label="`Clear ${props.label.toLowerCase()}`" @click="emit('update:modelValue', '')">
            <HugeiconsIcon :icon="Cancel01Icon" class="size-4" aria-hidden="true" />
        </button>
    </div>
</template>
