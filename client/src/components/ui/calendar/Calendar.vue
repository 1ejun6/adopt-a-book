<script setup>
import { CalendarRoot, CalendarHeader, CalendarHeading, CalendarPrev, CalendarNext, CalendarGrid, CalendarGridHead,
    CalendarGridBody, CalendarGridRow, CalendarHeadCell, CalendarCell, CalendarCellTrigger } from 'reka-ui';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

//@lee-hlmilk > shadcn calendar composition > Reka handles date navigation &&& keyboard selection
const props = defineProps({
    modelValue: { type: Object, default: undefined },
    defaultPlaceholder: { type: Object, default: undefined }
});
const emit = defineEmits(['update:modelValue']);
</script>

<template>
    <CalendarRoot v-slot="{ grid, weekDays }" :modelValue="props.modelValue" :defaultPlaceholder="props.defaultPlaceholder"
        locale="en-SG" weekdayFormat="short" fixedWeeks initialFocus class="p-2.5"
        @update:modelValue="emit('update:modelValue', $event)">
        <CalendarHeader class="flex items-center justify-between gap-2.5">
            <CalendarPrev aria-label="Previous month" class="inline-flex size-8 items-center justify-center rounded-lg border hover:bg-primary">
                <HugeiconsIcon :icon="ArrowLeft01Icon" class="size-4" aria-hidden="true" />
            </CalendarPrev>
            <CalendarHeading class="text-sm" />
            <CalendarNext aria-label="Next month" class="inline-flex size-8 items-center justify-center rounded-lg border hover:bg-primary">
                <HugeiconsIcon :icon="ArrowRight01Icon" class="size-4" aria-hidden="true" />
            </CalendarNext>
        </CalendarHeader>
        <CalendarGrid v-for="month in grid" :key="month.value.toString()" class="mt-2.5 w-full text-sm">
            <CalendarGridHead>
                <CalendarGridRow>
                    <CalendarHeadCell v-for="day in weekDays" :key="day" class="h-8 text-xs font-normal text-muted-foreground">{{ day }}</CalendarHeadCell>
                </CalendarGridRow>
            </CalendarGridHead>
            <CalendarGridBody>
                <CalendarGridRow v-for="(week, index) in month.rows" :key="index">
                    <CalendarCell v-for="day in week" :key="day.toString()" :date="day" class="text-center">
                        <CalendarCellTrigger :day="day" :month="month.value"
                            class="inline-flex size-8 items-center justify-center rounded-lg border border-transparent hover:bg-primary data-[selected]:bg-primary data-[selected]:border-foreground data-[today]:font-bold data-[outside-view]:text-muted-foreground data-[outside-view]:opacity-50" />
                    </CalendarCell>
                </CalendarGridRow>
            </CalendarGridBody>
        </CalendarGrid>
    </CalendarRoot>
</template>
