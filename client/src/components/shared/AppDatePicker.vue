<script setup>
import { computed, ref } from 'vue';
import { parseDate, today } from '@internationalized/date';
import { Calendar03Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const props = defineProps({
    modelValue: { type: String, default: '' },
    label: { type: String, default: 'Date' },
    compact: { type: Boolean, default: false },
    filter: { type: Boolean, default: false },
    id: { type: String, default: undefined },
    min: { type: String, default: undefined },
    disabled: { type: Boolean, default: false },
    invalid: { type: Boolean, default: false }
});
const emit = defineEmits(['update:modelValue']);
const open = ref(false);
//@lee-hlmilk > calendar uses DateValue > keep the existing YYYY-MM-DD string filter in views
const selectedDate = computed(() => props.modelValue ? parseDate(props.modelValue) : undefined);
const defaultDate = today('Asia/Singapore');
const minimumDate = computed(() => props.min ? parseDate(props.min) : undefined);
function selectDate(date) {
    emit('update:modelValue', date?.toString() || '');
    open.value = false;
}
</script>

<template>
    <div class="flex w-full min-w-0 gap-2.5" :class="props.filter ? 'sm:w-44' : props.compact ? 'sm:w-auto' : 'sm:w-56'">
        <Popover :open="open" @update:open="open = $event">
            <PopoverTrigger asChild>
                <Button type="button" variant="outline" :id="props.id" :aria-invalid="props.invalid" :disabled="props.disabled" :aria-label="props.label" class="w-full min-w-0 gap-2.5 px-2.5 text-left text-sm font-normal" :class="props.filter ? 'h-[46px]' : 'h-11'">
                    <span class="min-w-0 flex-1 truncate" :class="!props.modelValue && 'text-muted-foreground'">{{ props.modelValue ? props.modelValue.split('-').reverse().join('/') : 'dd/mm/yyyy' }}</span>
                    <HugeiconsIcon :icon="Calendar03Icon" class="size-4 shrink-0" aria-hidden="true" />
                </Button>
            </PopoverTrigger>
            <!--@lee-hlmilk > Calendar owns the inset > PopoverContent adds the border &&& background without extra padding-->
            <PopoverContent align="start">
                <Calendar :modelValue="selectedDate" :defaultPlaceholder="defaultDate" :minValue="minimumDate" :disabled="props.disabled" @update:modelValue="selectDate" />
            </PopoverContent>
        </Popover>
        <button v-if="props.modelValue" type="button" :disabled="props.disabled" class="grid shrink-0 place-items-center" :class="props.filter ? 'size-[46px]' : 'size-11'"
            :aria-label="`Clear ${props.label.toLowerCase()}`" @click="emit('update:modelValue', '')">
            <HugeiconsIcon :icon="Cancel01Icon" class="size-4" aria-hidden="true" />
        </button>
    </div>
</template>
