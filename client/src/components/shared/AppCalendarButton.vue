<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { ref, computed } from 'vue';
import { Calendar03Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { googleCalendarUrl, downloadCalendar } from '@/lib/calendar';
const props = defineProps({ event: Object, disabled: Boolean });
const open = ref(false);
const googleUrl = computed(() => googleCalendarUrl(props.event));
function download() { downloadCalendar(props.event); open.value = false; }
</script>
<template>
  <Popover v-if="event" v-model:open="open">
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" :disabled="disabled">
        <HugeiconsIcon :icon="Calendar03Icon" class="size-4" aria-hidden="true" />Add to calendar
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="grid w-64 gap-2 p-3" aria-label="Calendar options">
      <Button asChild variant="outline"><a :href="googleUrl" target="_blank" rel="noopener noreferrer" @click="open = false"><AppIcon name="calendar" />Google Calendar</a></Button>
      <Button type="button" variant="outline" @click="download"><AppIcon name="calendar" />Download calendar file</Button>
    </PopoverContent>
  </Popover>
</template>
