<script setup>
import DriveBookSelection from './DriveBookSelection.vue';
import AppTextarea from '@/components/shared/AppTextarea.vue';
import AppIcon from '@/components/shared/AppIcon.vue';
import AppDatePicker from '@/components/shared/AppDatePicker.vue';
import AppTimePicker from '@/components/shared/AppTimePicker.vue';
import { computed, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { useFormValidation } from '@/composables/useFormValidation';
import AppLocationFilter from '@/components/shared/AppLocationFilter.vue';
import { withCurrentStation } from '@/lib/stations';
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
    booksRevision: { type: Number, default: 0 },
    submitting: { type: Boolean, default: false }
});
const emit = defineEmits(['update:open', 'submit']);
const draft = reactive({ bookids: [], title: '', location: '', mrtstationid: '', eventdate: '', starttime: '', endtime: '', maxcapacity: 30, description: '' });
const initialForm = ref('');
const booksValid = ref(false);
const maxDescriptionWords = 500;
const descriptionWordCount = computed(() => draft.description.trim().split(/\s+/u).filter(Boolean).length);
const locationSelection = computed(() => {
    const station = stationOptions.value.find(station => station.id === draft.mrtstationid);
    return station ? { location: { name: draft.location }, radiusKm: 20, stations: [station], nearestStation: station } : null;
});
function chooseLocation(result) {
    draft.mrtstationid = result?.nearestStation?.id || '';
    if (result) draft.location = result.location.name;
}
const { invalidFields, validate, clearInvalid, focusInvalid, resetValidation } = useFormValidation();
const dirty = computed(() => JSON.stringify(draft) !== initialForm.value);
const minimumCapacity = computed(() => Math.max(1, props.drive?.userids?.length || 0));
const stationOptions = computed(() => withCurrentStation(props.stations, props.drive?.mrtstation));

//@lee-hlmilk > copy props into the draft on opening > typing leaves the saved drive unchanged &&& failed saves keep edits
watch(() => props.open, isOpen => {
    if (!isOpen) { return; }
    booksValid.value = false;
    Object.assign(draft, {
        bookids: [...(props.drive?.bookids || [])],
        title: props.drive?.title || '', location: props.drive?.location || '', mrtstationid: props.drive?.mrtstationid || '',
        starttime: props.drive?.starttime?.slice(0, 5) || '', endtime: props.drive?.endtime?.slice(0, 5) || '',
        eventdate: props.drive?.eventdate || props.today, maxcapacity: props.drive?.maxcapacity ?? 30, description: props.drive?.description || ''
    });
    initialForm.value = JSON.stringify(draft);
    resetValidation();
}, { immediate: true });

function submitDrive(event) {
    if (props.submitting) { return; }
    const form = event.target;
    form.querySelector('#drive-location').setCustomValidity(draft.mrtstationid ? '' : 'Find an address or MRT station first.');
    form.querySelector('#drive-description').setCustomValidity(descriptionWordCount.value > maxDescriptionWords ? `Use ${maxDescriptionWords} words or fewer.` : '');
    const capacity = Number(draft.maxcapacity);
    form.querySelector('#drive-capacity').setCustomValidity(Number.isInteger(capacity) && capacity >= minimumCapacity.value && capacity <= 2147483647 ? '' : `Enter a whole number between ${minimumCapacity.value} and 2147483647.`);
    const valid = validate(form);
    const dateValid = draft.eventdate && (draft.eventdate >= props.today || draft.eventdate === props.drive?.eventdate);
    if (!dateValid) invalidFields.value.push('drive-date');
    if (!draft.starttime) invalidFields.value.push('drive-starttime');
    if (!draft.endtime) invalidFields.value.push('drive-endtime');
    if (!valid || !dateValid || !draft.starttime || !draft.endtime) {
        toast.error(descriptionWordCount.value > maxDescriptionWords ? `Description must be ${maxDescriptionWords} words or fewer.` : 'Please check the highlighted fields. Complete all required fields and check the date and capacity.');
        focusInvalid(event.target);
        return;
    }
    if (draft.endtime <= draft.starttime) {
        invalidFields.value.push('drive-endtime');
        toast.error('End time must be after start time.');
        document.getElementById('drive-endtime')?.focus();
        return;
    }
    if (!booksValid.value || !draft.bookids.length) {
        toast.error('Select at least one available book at this MRT and remove unavailable copies.');
        return;
    }
    emit('submit', { ...draft, maxcapacity: capacity, description: draft.description.trim() });
}

watch(() => draft.eventdate, () => {
    invalidFields.value = invalidFields.value.filter(id => id !== 'drive-date');
});

watch(() => [draft.starttime, draft.endtime], () => {
    invalidFields.value = invalidFields.value.filter(id => !['drive-starttime', 'drive-endtime'].includes(id));
});
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
                <FieldLabel for="drive-location">Venue or MRT station <span class="text-destructive" aria-hidden="true">*</span></FieldLabel>
                <AppLocationFilter :key="props.drive?.id || 'new'" id="drive-location" v-model:address="draft.location"
                    venue :selection="locationSelection" :stations="stationOptions" :disabled="props.submitting"
                    required :invalid="invalidFields.includes('drive-location')" placeholder="Postcode, address or MRT station"
                    @change="chooseLocation" />
            </Field>
            <DriveBookSelection v-model="draft.bookids" :open="props.open" :stationId="draft.mrtstationid" :drive="props.drive" :disabled="submitting" :revision="booksRevision" @valid="booksValid = $event" />
            <div class="grid gap-5 sm:grid-cols-2">
                <Field>
                    <FieldLabel for="drive-date">Event date <span class="text-destructive" aria-hidden="true">*</span></FieldLabel>
                    <!--@lee-hlmilk > existing past dates may stay unchanged > new ||| changed dates must be today or later-->
                    <AppDatePicker id="drive-date" v-model="draft.eventdate" label="Event date" compact :min="props.drive && draft.eventdate === props.drive.eventdate ? undefined : props.today"
                        :disabled="props.submitting" :invalid="invalidFields.includes('drive-date')" />
                </Field>
                <Field>
                    <FieldLabel for="drive-capacity">Maximum capacity <span class="text-destructive" aria-hidden="true">*</span></FieldLabel>
                    <Input id="drive-capacity" v-model="draft.maxcapacity" type="text" inputmode="numeric" pattern="[0-9]+" required @input="$event.target.setCustomValidity('')"
                        :disabled="props.submitting" :aria-invalid="invalidFields.includes('drive-capacity')" />
                </Field>
            </div>
            <div class="grid gap-5 sm:grid-cols-2">
                <Field><FieldLabel for="drive-starttime">Start time (SGT) *</FieldLabel>
                    <AppTimePicker id="drive-starttime" v-model="draft.starttime" label="Start time" :disabled="submitting" :invalid="invalidFields.includes('drive-starttime')" />
                </Field>
                <Field><FieldLabel for="drive-endtime">End time (SGT) *</FieldLabel>
                    <AppTimePicker id="drive-endtime" v-model="draft.endtime" label="End time" :disabled="submitting" :invalid="invalidFields.includes('drive-endtime')" />
                </Field>
            </div>
            <Field>
                <FieldLabel for="drive-description">Description</FieldLabel>
                <AppTextarea id="drive-description" v-model="draft.description" rows="3" aria-describedby="drive-description-count" :aria-invalid="invalidFields.includes('drive-description')" @input="$event.target.setCustomValidity('')" :disabled="props.submitting" class="rounded-lg border p-2.5 text-base" />
                <p id="drive-description-count" class="text-right text-sm" :class="descriptionWordCount > maxDescriptionWords ? 'text-destructive' : 'text-muted-foreground'">{{ descriptionWordCount }} / {{ maxDescriptionWords }} words max</p>
            </Field>
        </div>
        <template #footer>
            <Button type="submit" class="w-full " :disabled="props.submitting" :loading="props.submitting" title="Save drive"><AppIcon name="save" /><span class="sr-only">{{ props.submitting ? 'Saving…' : 'Save drive' }}</span></Button>
        </template>
    </AdminFormDialog>
</template>
