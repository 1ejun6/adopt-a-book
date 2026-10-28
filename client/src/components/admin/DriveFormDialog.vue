<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import AdminFormDialog from '@/components/admin/AdminFormDialog.vue';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

//@lee-hlmilk > keep the draft here > the view owns saving &&& supplies station choices through props
const props = defineProps({
    open: { type: Boolean, default: false },
    drive: { type: Object, default: null },
    stations: { type: Array, default: () => [] },
    today: { type: String, required: true },
    submitting: { type: Boolean, default: false }
});
const emit = defineEmits(['update:open', 'submit']);
const draft = reactive({ title: '', location: '', mrtstationid: '', eventdate: '', maxcapacity: 30, description: '' });
const initialForm = ref('');
const invalidFields = ref([]);
const dirty = computed(() => JSON.stringify(draft) !== initialForm.value);
const minimumCapacity = computed(() => Math.max(1, props.drive?.userids?.length || 0));
const stationOptions = computed(() => {
    const current = props.drive?.mrtstation;
    return current?.id && !props.stations.some(station => station.id === current.id) ? [current, ...props.stations] : props.stations;
});

//@lee-hlmilk > copy props into the draft on opening > typing leaves the saved drive unchanged &&& failed saves keep edits
watch(() => props.open, isOpen => {
    if (!isOpen) { return; }
    Object.assign(draft, {
        title: props.drive?.title || '', location: props.drive?.location || '', mrtstationid: props.drive?.mrtstationid || '',
        eventdate: props.drive?.eventdate || props.today, maxcapacity: props.drive?.maxcapacity ?? 30, description: props.drive?.description || ''
    });
    initialForm.value = JSON.stringify(draft);
    invalidFields.value = [];
}, { immediate: true });

function clearInvalid(event) {
    if (event.target.validity?.valid) { invalidFields.value = invalidFields.value.filter(id => id !== event.target.id); }
}

function submitDrive(event) {
    if (props.submitting) { return; }
    invalidFields.value = Array.from(event.target.elements).filter(field => field.willValidate && !field.validity.valid).map(field => field.id);
    if (invalidFields.value.length) {
        toast.error('Please check the highlighted fields. Complete all required fields and check the date and capacity.');
        nextTick(() => event.target.querySelector('[aria-invalid="true"]')?.focus());
        return;
    }
    emit('submit', { ...draft, description: draft.description.trim() });
}
</script>

<template>
    <!--@lee-hlmilk > explicit open/update:open is the v-model contract > relay allowed close changes to the view-->
    <AdminFormDialog :open="props.open" :title="props.drive ? 'Edit drive' : 'Create drive'" :dirty="dirty"
        :submitting="props.submitting" noValidate :showFooterSeparator="false"
        @update:open="emit('update:open', $event)" @submit="submitDrive">
        <!--@lee-hlmilk > this group spaces fields > the outer form spaces the group from its footer > input/change bubble here-->
        <div class="space-y-5" @input="clearInvalid" @change="clearInvalid">
            <p class="text-muted-foreground"><span class="text-destructive" aria-hidden="true">*</span> Required</p>
            <Field>
                <FieldLabel for="drive-title">Drive title <span class="text-destructive" aria-hidden="true">*</span></FieldLabel>
                <Input id="drive-title" v-model="draft.title" required pattern=".*\S.*" :disabled="props.submitting" :aria-invalid="invalidFields.includes('drive-title')" />
            </Field>
            <Field>
                <FieldLabel for="drive-location">Venue and address <span class="text-destructive" aria-hidden="true">*</span></FieldLabel>
                <Input id="drive-location" v-model="draft.location" required pattern=".*\S.*" :disabled="props.submitting" :aria-invalid="invalidFields.includes('drive-location')" />
            </Field>
            <Field>
                <FieldLabel for="drive-station">Nearest MRT station <span class="text-destructive" aria-hidden="true">*</span></FieldLabel>
                <select id="drive-station" v-model="draft.mrtstationid" required :disabled="props.submitting" :aria-invalid="invalidFields.includes('drive-station')" class="h-9 w-full rounded-lg border bg-background px-3 text-sm">
                    <option value="" disabled>Select an MRT station</option>
                    <option v-for="station in stationOptions" :key="station.id" :value="station.id">{{ station.name }}</option>
                </select>
            </Field>
            <div class="grid gap-5 sm:grid-cols-2">
                <Field>
                    <FieldLabel for="drive-date">Event date <span class="text-destructive" aria-hidden="true">*</span></FieldLabel>
                    <!--@lee-hlmilk > existing past dates may stay unchanged > new ||| changed dates must be today or later-->
                    <Input id="drive-date" v-model="draft.eventdate" type="date" required :min="props.drive && draft.eventdate === props.drive.eventdate ? undefined : props.today"
                        :disabled="props.submitting" :aria-invalid="invalidFields.includes('drive-date')" />
                </Field>
                <Field>
                    <FieldLabel for="drive-capacity">Maximum capacity <span class="text-destructive" aria-hidden="true">*</span></FieldLabel>
                    <Input id="drive-capacity" v-model="draft.maxcapacity" type="number" required :min="minimumCapacity" max="2147483647" step="1"
                        :disabled="props.submitting" :aria-invalid="invalidFields.includes('drive-capacity')" />
                </Field>
            </div>
            <p v-if="props.drive" class="text-muted-foreground">{{ props.drive.userids?.length || 0 }} registered. Capacity cannot be lower than this count.</p>
            <Field>
                <FieldLabel for="drive-description">Description</FieldLabel>
                <textarea id="drive-description" v-model="draft.description" rows="3" :disabled="props.submitting" class="rounded-lg border p-2.5" />
            </Field>
        </div>
        <template #footer>
            <Button type="submit" class="w-full" :disabled="props.submitting">{{ props.submitting ? 'Saving…' : props.drive ? 'Save changes' : 'Create drive' }}</Button>
        </template>
    </AdminFormDialog>
</template>
